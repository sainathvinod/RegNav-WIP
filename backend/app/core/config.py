"""Application settings loaded from environment variables.

All secrets in production come from Azure Key Vault via Managed Service
Identity. This module is the only place where environment values are
read; the rest of the codebase imports `settings` from here.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---------------------------------------------------
    app_name: str = "RegNav API"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # --- HTTP / CORS ---------------------------------------------------
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
    )

    # --- Database ------------------------------------------------------
    database_url: str = "postgresql+asyncpg://regnav:regnav@localhost:5432/regnav"
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # --- Redis ---------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # --- Auth (Azure AD B2C) ------------------------------------------
    azure_ad_b2c_tenant: str | None = None
    azure_ad_b2c_client_id: str | None = None
    azure_ad_b2c_policy: str | None = None
    jwt_audience: str | None = None
    jwt_algorithm: str = "RS256"

    # --- Azure / LLM ---------------------------------------------------
    azure_keyvault_url: str | None = None
    azure_openai_endpoint: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None

    # --- RAG / chat ----------------------------------------------------
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "claude-sonnet-4-20250514"
    rag_top_k: int = 5
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 100

    # --- Email / Notifications ----------------------------------------
    email_provider: Literal["log", "acs"] = "log"
    email_from_address: str | None = None
    acs_connection_string: str | None = None

    # --- Telemetry -----------------------------------------------------
    log_level: str = "INFO"
    log_json: bool = True

    # OpenTelemetry — off by default. Enable + set the OTLP endpoint to
    # ship traces to Azure Application Insights or a generic collector.
    otel_enabled: bool = False
    otel_service_name: str = "regnav-backend"
    otel_exporter_otlp_endpoint: str | None = None
    otel_exporter_otlp_headers: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
