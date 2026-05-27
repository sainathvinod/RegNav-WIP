"""Shared LLM credential resolver — Azure Key Vault → env var fallback.

Cached per-process so we only round-trip to Key Vault once per secret.
"""

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Per-process secret cache: {secret_name: resolved_value}
_cache: dict[str, str] = {}


async def _from_keyvault(secret_name: str) -> str | None:
    """Try to fetch a secret from Azure Key Vault. Returns None on failure."""
    if not settings.azure_keyvault_url:
        return None

    try:
        from azure.identity.aio import DefaultAzureCredential
        from azure.keyvault.secrets.aio import SecretClient

        async with (
            DefaultAzureCredential() as credential,
            SecretClient(
                vault_url=settings.azure_keyvault_url,
                credential=credential,
            ) as client,
        ):
            secret = await client.get_secret(secret_name)
            return secret.value
    except Exception as exc:  # pragma: no cover — best-effort path
        logger.warning(
            "keyvault_secret_fetch_failed",
            secret_name=secret_name,
            error=str(exc),
        )
        return None


async def resolve_secret(
    secret_name: str,
    env_fallback: str | None,
    *,
    label: str,
) -> str:
    """Return a secret value from Key Vault, falling back to the env var.

    Raises HTTP 503 if neither source provides a value.
    """
    if secret_name in _cache:
        return _cache[secret_name]

    kv_value = await _from_keyvault(secret_name)
    if kv_value:
        _cache[secret_name] = kv_value
        logger.info("llm_key_loaded_from_keyvault", label=label)
        return kv_value

    if env_fallback:
        _cache[secret_name] = env_fallback
        logger.info("llm_key_loaded_from_env", label=label)
        return env_fallback

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"{label} API key not configured. "
            f"Set the appropriate env var or configure Azure Key Vault."
        ),
    )


async def get_anthropic_api_key() -> str:
    return await resolve_secret(
        "anthropic-api-key",
        settings.anthropic_api_key,
        label="Anthropic",
    )


async def get_openai_api_key() -> str:
    return await resolve_secret(
        "openai-api-key",
        settings.openai_api_key,
        label="OpenAI",
    )
