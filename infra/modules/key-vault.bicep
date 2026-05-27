// Azure Key Vault — RBAC-enabled, soft-delete on. Holds secrets surfaced to
// the backend / worker through Container Apps secret references.

param keyVaultName string
param location string

@description('Tenant ID; defaults to the subscription tenant.')
param tenantId string = subscription().tenantId

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
  }
}

output id string = keyVault.id
output uri string = keyVault.properties.vaultUri
output name string = keyVault.name
