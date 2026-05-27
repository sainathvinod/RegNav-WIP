"""OpenAI / Azure OpenAI embeddings client used by the RAG ingestion pipeline."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.core.telemetry import get_tracer
from app.llm.credentials import get_openai_api_key

logger = get_logger(__name__)
tracer = get_tracer(__name__)

_BATCH_SIZE = 100


class EmbeddingClient:
    """Thin wrapper around AsyncOpenAI / AsyncAzureOpenAI.

    Lazily constructs the underlying client on first use so config errors
    surface only when embeddings are actually requested.
    """

    def __init__(self, model: str | None = None) -> None:
        self.model = model or settings.embedding_model
        self._client: Any | None = None

    async def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        api_key = await get_openai_api_key()

        if settings.azure_openai_endpoint:
            from openai import AsyncAzureOpenAI

            self._client = AsyncAzureOpenAI(
                api_key=api_key,
                azure_endpoint=settings.azure_openai_endpoint,
                api_version="2024-08-01-preview",
            )
            logger.info("embedding_client_initialized", provider="azure_openai")
        else:
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=api_key)
            logger.info("embedding_client_initialized", provider="openai")

        return self._client

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts; batches up to 100 per request."""
        if not texts:
            return []

        with tracer.start_as_current_span("openai.embeddings.create") as span:
            span.set_attribute("gen_ai.system", "openai")
            span.set_attribute("gen_ai.request.model", self.model)
            span.set_attribute("gen_ai.request.input_count", len(texts))

            client = await self._get_client()
            out: list[list[float]] = []
            for start in range(0, len(texts), _BATCH_SIZE):
                batch = texts[start : start + _BATCH_SIZE]
                response = await client.embeddings.create(model=self.model, input=batch)
                out.extend([row.embedding for row in response.data])

            span.set_attribute("gen_ai.response.embedding_count", len(out))
            logger.debug("embeddings_generated", count=len(out), model=self.model)
            return out

    async def embed_single(self, text: str) -> list[float]:
        result = await self.embed([text])
        return result[0]
