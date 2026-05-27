// Container Apps Environment + backend (HTTPS ingress) + worker (no ingress).
//
// Both apps:
//   - Use system-assigned managed identity
//   - Pull images from ACR via AcrPull on the managed identity
//   - Get secrets injected from Key Vault via secret references
//   - Ship logs + traces to the Log Analytics workspace / Application Insights

param caeName string
param backendAppName string
param workerAppName string
param location string
param environment string

@description('Log Analytics workspace customer ID for the CAE log destination.')
param workspaceCustomerId string

@secure()
param workspaceSharedKey string

param appInsightsConnectionString string

param acrLoginServer string
param keyVaultName string
param postgresHost string
param redisHost string

@secure()
param redisKey string

param imageTag string

@minValue(0)
@maxValue(20)
param minReplicas int = 1

@minValue(1)
@maxValue(30)
param maxReplicas int = 5

var backendImage = '${acrLoginServer}/regnav-backend:${imageTag}'

// -----------------------------------------------------------------------------
// CAE
// -----------------------------------------------------------------------------

resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: caeName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: workspaceCustomerId
        sharedKey: workspaceSharedKey
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Backend
// -----------------------------------------------------------------------------

resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'redis-key'
          value: redisKey
        }
        {
          name: 'app-insights-cs'
          value: appInsightsConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'APP_ENV', value: environment }
            { name: 'LOG_JSON', value: 'true' }
            { name: 'LOG_LEVEL', value: 'INFO' }
            {
              name: 'REDIS_URL'
              value: 'rediss://:${redisKey}@${redisHost}:6380/0'
            }
            { name: 'AZURE_KEYVAULT_URL', value: 'https://${keyVaultName}.vault.azure.net/' }
            { name: 'OTEL_ENABLED', value: 'true' }
            { name: 'OTEL_SERVICE_NAME', value: 'regnav-backend' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'app-insights-cs' }
            { name: 'POSTGRES_HOST', value: postgresHost }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Worker (no ingress)
// -----------------------------------------------------------------------------

resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: workerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'redis-key'
          value: redisKey
        }
        {
          name: 'app-insights-cs'
          value: appInsightsConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: backendImage
          command: ['python', '-m', 'app.workers.cli']
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'APP_ENV', value: environment }
            { name: 'LOG_JSON', value: 'true' }
            { name: 'LOG_LEVEL', value: 'INFO' }
            {
              name: 'REDIS_URL'
              value: 'rediss://:${redisKey}@${redisHost}:6380/0'
            }
            { name: 'AZURE_KEYVAULT_URL', value: 'https://${keyVaultName}.vault.azure.net/' }
            { name: 'OTEL_ENABLED', value: 'true' }
            { name: 'OTEL_SERVICE_NAME', value: 'regnav-worker' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'app-insights-cs' }
            { name: 'POSTGRES_HOST', value: postgresHost }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Role assignments — give the apps' managed identities AcrPull on the registry
// and Key Vault Secrets User on the vault.
// -----------------------------------------------------------------------------

// AcrPull
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: replace(acrLoginServer, '.azurecr.io', '')
}

var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource backendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, backend.id, acrPullRoleId)
  properties: {
    principalId: backend.identity.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      acrPullRoleId
    )
    principalType: 'ServicePrincipal'
  }
}

resource workerAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, worker.id, acrPullRoleId)
  properties: {
    principalId: worker.identity.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      acrPullRoleId
    )
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secrets User (4633458b-17de-409a-b874-0f234500a31a)
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

var kvSecretsUserRoleId = '4633458b-17de-409a-b874-0f234500a31a'

resource backendKvAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, backend.id, kvSecretsUserRoleId)
  properties: {
    principalId: backend.identity.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      kvSecretsUserRoleId
    )
    principalType: 'ServicePrincipal'
  }
}

resource workerKvAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, worker.id, kvSecretsUserRoleId)
  properties: {
    principalId: worker.identity.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      kvSecretsUserRoleId
    )
    principalType: 'ServicePrincipal'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output backendFqdn string = backend.properties.configuration.ingress.fqdn
output backendPrincipalId string = backend.identity.principalId
output workerPrincipalId string = worker.identity.principalId
output environmentId string = cae.id
