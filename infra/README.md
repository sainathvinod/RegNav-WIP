# RegNav.AI — Azure Infrastructure

Bicep templates that provision the full RegNav.AI footprint on Azure.

## What gets created

| Resource | Purpose |
|---|---|
| Log Analytics workspace + Application Insights | Logs + traces destination |
| Azure Container Registry (Basic) | Stores `regnav-backend` images |
| Azure Key Vault (RBAC, soft-delete + purge-protect) | All secrets at runtime |
| Azure Database for PostgreSQL Flexible Server | Postgres 16 with `pgvector`, `uuid-ossp`, `pgcrypto` extensions enabled |
| Azure Cache for Redis | Job queue / rate-limit counter store |
| Container Apps Environment | Shared CAE for both apps |
| Container App — `regnav-backend` | FastAPI app, HTTPS ingress, autoscale 1→N |
| Container App — `regnav-worker` | Background job runner, no ingress |
| Role assignments | Backend + worker managed identities get `AcrPull` and `Key Vault Secrets User` |

## Layout

```
infra/
├── main.bicep                          # orchestrator
├── modules/
│   ├── observability.bicep             # Log Analytics + App Insights
│   ├── container-registry.bicep        # ACR (Basic, admin off)
│   ├── key-vault.bicep                 # KV with RBAC + purge protect
│   ├── postgres.bicep                  # Flexible Server + DB + extensions
│   ├── redis.bicep                     # Cache for Redis
│   └── container-apps.bicep            # CAE + backend + worker + RBAC
└── parameters/
    ├── staging.json
    └── production.json
```

## Prerequisites

1. **Azure CLI** ≥ 2.60 with the Bicep CLI installed (`az bicep install`).
2. **Subscription** owner or Contributor + User Access Administrator at the subscription scope (role assignments need this).
3. **Shared secrets vault** (one per subscription) holding the Postgres admin password. Update the `subscriptionId` placeholder in `parameters/*.json`.

## First-time provision

```bash
# 1. Create the resource group
az group create -n regnav-staging-rg -l eastus2

# 2. Validate the template
az deployment group validate \
  --resource-group regnav-staging-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/staging.json

# 3. Deploy
az deployment group create \
  --resource-group regnav-staging-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/staging.json \
  --name regnav-initial
```

The deployment outputs include:
- `backendFqdn` — public URL of the API
- `acrLoginServer` — push images here
- `keyVaultUri` — set as `AZURE_KEYVAULT_URL` (already wired)
- `appInsightsConnectionString` — already injected into both apps

## Populate Key Vault secrets

After the vault exists, add the secrets the app expects:

```bash
KV=regnav-staging-kv

# Anthropic API key (or use Azure OpenAI — set AZURE_OPENAI_ENDPOINT in env instead)
az keyvault secret set --vault-name $KV --name anthropic-api-key --value 'sk-ant-...'

# OpenAI for embeddings (skip if using Azure OpenAI)
az keyvault secret set --vault-name $KV --name openai-api-key --value 'sk-...'

# Database URL (asyncpg driver)
az keyvault secret set --vault-name $KV --name database-url \
  --value 'postgresql+asyncpg://regnav_admin:PASSWORD@regnav-staging-pg.postgres.database.azure.com:5432/regnav?ssl=require'

# Azure AD B2C
az keyvault secret set --vault-name $KV --name azure-ad-b2c-tenant --value '...'
az keyvault secret set --vault-name $KV --name azure-ad-b2c-client-id --value '...'
az keyvault secret set --vault-name $KV --name jwt-audience --value '...'

# ACS for email (optional)
az keyvault secret set --vault-name $KV --name acs-connection-string --value '...'
```

The backend reads these via `app.llm.credentials.get_*_api_key()` and the
`AZURE_KEYVAULT_URL` env var that's already set by Bicep.

## Run database migrations

After the first deploy, run Alembic against the freshly-provisioned Postgres:

```bash
DB_URL=$(az keyvault secret show --vault-name regnav-staging-kv \
  --name database-url --query value -o tsv)

DATABASE_URL=$DB_URL python -m alembic upgrade head
```

In CI this is handled by the migrate job in `.github/workflows/deploy-aca.yml`.

## Per-environment scaling

Production-grade overrides land in `parameters/production.json`:
- `backendMinReplicas: 2` (always-warm)
- `backendMaxReplicas: 10`
- Bump Postgres to `MemoryOptimized` and enable HA in `modules/postgres.bicep`
- Bump Redis to `Premium` for replication + zone redundancy

## Tear-down

```bash
# Note: Key Vault is purge-protected — purging takes ≥7 days.
az group delete --name regnav-staging-rg --yes
```

## Cost notes

Default SKUs (`Standard_D2s_v3` Postgres, Basic Redis C0, Basic ACR) cost
roughly $150–250/month for staging. Production sizing with HA Postgres +
Premium Redis lands around $700–1200/month before storage and traffic.
