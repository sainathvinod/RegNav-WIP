// Azure Database for PostgreSQL Flexible Server with the pgvector extension
// pre-allowed. SKU sized for staging; bump tier + storage for production.

param serverName string
param location string
param adminLogin string

@secure()
param adminPassword string

@description('PostgreSQL version. Keep on a supported major version with pgvector.')
@allowed(['15', '16'])
param postgresVersion string = '16'

@description('Storage size in GB. Minimum 32; production should be 256+.')
@minValue(32)
@maxValue(16384)
param storageSizeGB int = 32

@description('Compute tier / size. Default GP_Standard_D2s_v3 — good staging baseline.')
param skuName string = 'Standard_D2s_v3'

@description('SKU tier — Burstable for dev, GeneralPurpose for staging+, MemoryOptimized for prod.')
@allowed(['Burstable', 'GeneralPurpose', 'MemoryOptimized'])
param skuTier string = 'GeneralPurpose'

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: postgresVersion
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'  // Enable ZoneRedundant for production.
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }

  resource regnavDb 'databases' = {
    name: 'regnav'
    properties: {
      charset: 'UTF8'
      collation: 'en_US.utf8'
    }
  }

  // Allow Azure services (Container Apps egress) to connect.
  // Tighten to a VNet-integrated private endpoint for production.
  resource fwAllowAzure 'firewallRules' = {
    name: 'AllowAzureServices'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }

  // Enable the extensions we need server-side (pgvector + uuid-ossp etc.).
  resource extensions 'configurations' = {
    name: 'azure.extensions'
    properties: {
      value: 'vector,uuid-ossp,pgcrypto'
      source: 'user-override'
    }
  }
}

output id string = server.id
output fqdn string = server.properties.fullyQualifiedDomainName
output name string = server.name
