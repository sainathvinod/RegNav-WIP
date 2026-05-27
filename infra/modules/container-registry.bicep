// Azure Container Registry — Basic tier. Admin user disabled; Container Apps
// pulls via the system-assigned managed identity granted AcrPull in the
// container-apps module.

param acrName string
param location string

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

output id string = acr.id
output loginServer string = acr.properties.loginServer
output name string = acr.name
