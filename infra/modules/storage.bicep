// Azure Storage Account for archived raw documents (PDFs, HTML-as-PDF renders).
// One container ("regnav-archives") holds keys under {tenant_id}/{document_id}.{ext}.
// Public network access is enabled but anonymous blob access is OFF — the API
// streams bytes back via the worker MI's storage role assignment.

param storageName string
param location string
param containerName string = 'regnav-archives'

@allowed(['Standard_LRS', 'Standard_ZRS', 'Standard_GRS'])
param sku string = 'Standard_LRS'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: sku
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource archiveContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
  }
}

@description('The blob endpoint URL — set this as AZURE_STORAGE_ACCOUNT_URL in the backend.')
output blobEndpoint string = storage.properties.primaryEndpoints.blob

@description('Storage account resource ID (for role assignments).')
output id string = storage.id

@description('The container name where archives live.')
output containerName string = containerName
