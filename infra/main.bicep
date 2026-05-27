// =============================================================================
// RegNav.AI — Azure deployment, all in one resource group.
//
// Provisions:
//   - Log Analytics workspace + Application Insights
//   - Azure Container Registry (Basic)
//   - Azure Key Vault (RBAC-mode, soft-delete enabled)
//   - Azure Database for PostgreSQL Flexible Server (with pgvector extension)
//   - Azure Cache for Redis (Basic)
//   - Container Apps Environment + backend + worker
//   - System-assigned managed identity wired through to Key Vault
//
// Deploy with:
//   az deployment group create \
//     --resource-group regnav-staging-rg \
//     --template-file main.bicep \
//     --parameters parameters/staging.json
// =============================================================================

@description('Short environment tag (staging / production). Used as a suffix on resource names.')
@allowed(['dev', 'staging', 'production'])
param environment string = 'staging'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Globally-unique base name. Resources get this plus the environment.')
param baseName string

@description('Postgres administrator login.')
param postgresAdminLogin string

@secure()
@description('Postgres administrator password. Stored only in Key Vault after provisioning.')
param postgresAdminPassword string

@description('Container image tag to deploy. Override per release.')
param containerImageTag string = 'latest'

@description('Initial backend replica count.')
@minValue(0)
@maxValue(20)
param backendMinReplicas int = 1

@description('Maximum backend replicas under autoscale.')
@minValue(1)
@maxValue(30)
param backendMaxReplicas int = 5

// -----------------------------------------------------------------------------
// Naming
// -----------------------------------------------------------------------------

var resourcePrefix = '${baseName}-${environment}'
var acrName = replace(resourcePrefix, '-', '')           // ACR names must be alphanumeric
var keyVaultName = take('${resourcePrefix}-kv', 24)
var workspaceName = '${resourcePrefix}-logs'
var appInsightsName = '${resourcePrefix}-ai'
var postgresName = '${resourcePrefix}-pg'
var redisName = '${resourcePrefix}-redis'
var storageName = take(replace('${resourcePrefix}st', '-', ''), 24)  // Storage names: 3-24 lowercase alphanumeric
var caeName = '${resourcePrefix}-cae'
var backendAppName = '${resourcePrefix}-backend'
var workerAppName = '${resourcePrefix}-worker'

// -----------------------------------------------------------------------------
// Observability
// -----------------------------------------------------------------------------

module observability 'modules/observability.bicep' = {
  name: 'observability'
  params: {
    workspaceName: workspaceName
    appInsightsName: appInsightsName
    location: location
  }
}

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

module acr 'modules/container-registry.bicep' = {
  name: 'acr'
  params: {
    acrName: acrName
    location: location
  }
}

// -----------------------------------------------------------------------------
// Key Vault
// -----------------------------------------------------------------------------

module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault'
  params: {
    keyVaultName: keyVaultName
    location: location
  }
}

// -----------------------------------------------------------------------------
// Postgres
// -----------------------------------------------------------------------------

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    serverName: postgresName
    location: location
    adminLogin: postgresAdminLogin
    adminPassword: postgresAdminPassword
  }
}

// -----------------------------------------------------------------------------
// Redis
// -----------------------------------------------------------------------------

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    redisName: redisName
    location: location
  }
}

// -----------------------------------------------------------------------------
// Storage — archived document blobs (PDFs, HTML renders)
// -----------------------------------------------------------------------------

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    storageName: storageName
    location: location
  }
}

// -----------------------------------------------------------------------------
// Container Apps
// -----------------------------------------------------------------------------

module containerApps 'modules/container-apps.bicep' = {
  name: 'container-apps'
  params: {
    caeName: caeName
    backendAppName: backendAppName
    workerAppName: workerAppName
    location: location
    workspaceCustomerId: observability.outputs.workspaceCustomerId
    workspaceSharedKey: observability.outputs.workspaceSharedKey
    appInsightsConnectionString: observability.outputs.appInsightsConnectionString
    acrLoginServer: acr.outputs.loginServer
    keyVaultName: keyVault.outputs.name
    postgresHost: postgres.outputs.fqdn
    redisHost: redis.outputs.hostName
    redisKey: redis.outputs.primaryKey
    imageTag: containerImageTag
    minReplicas: backendMinReplicas
    maxReplicas: backendMaxReplicas
    environment: environment
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

@description('Public FQDN of the backend Container App.')
output backendFqdn string = containerApps.outputs.backendFqdn

@description('ACR login server (e.g. regnavstaging.azurecr.io).')
output acrLoginServer string = acr.outputs.loginServer

@description('Key Vault URI for the deploy workflow / app config.')
output keyVaultUri string = keyVault.outputs.uri

@description('Application Insights connection string (also exposed to the app via env).')
output appInsightsConnectionString string = observability.outputs.appInsightsConnectionString

@description('Blob endpoint for the archive container — set as AZURE_STORAGE_ACCOUNT_URL.')
output archiveBlobEndpoint string = storage.outputs.blobEndpoint
