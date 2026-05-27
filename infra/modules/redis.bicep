// Azure Cache for Redis — Basic C0 for dev/staging, bump to Standard/Premium
// with replication for production.

param redisName string
param location string

@allowed(['Basic', 'Standard', 'Premium'])
param redisSku string = 'Basic'

@minValue(0)
@maxValue(6)
param redisCapacity int = 0

resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: redisSku
      family: redisSku == 'Premium' ? 'P' : 'C'
      capacity: redisCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

output id string = redis.id
output hostName string = redis.properties.hostName
output primaryKey string = redis.listKeys().primaryKey
