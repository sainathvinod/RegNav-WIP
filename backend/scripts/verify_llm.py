"""End-to-end LLM connectivity verification.

Exercises the real production code paths used by RuleSense and the embedding
pipeline. Run this once you have API keys configured to confirm everything
is wired correctly before opening the app to users.

Usage
-----
  cd backend
  ANTHROPIC_API_KEY='sk-ant-...' OPENAI_API_KEY='sk-...' python scripts/verify_llm.py

For Azure Key Vault (production):
  Ensure AZURE_KEYVAULT_URL is set and the running identity has 'Key Vault
  Secrets User' on the vault. The script will pick up credentials
  automatically via DefaultAzureCredential.

Exit codes
----------
  0  — both providers responded correctly
  1  — one or both providers failed (details printed to stdout)
"""

from __future__ import annotations

import asyncio
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from app.llm.anthropic_chat import stream_chat
from app.llm.embeddings import EmbeddingClient

# ---------------------------------------------------------------------------
# Fixtures — synthetic cited material that mimics a real RegScout ingest
# ---------------------------------------------------------------------------

_DOCUMENT_TITLE = "TX Workers Compensation Notice 2026-12"
_CHUNKS = [
    {
        "chunk_id": "chunk-1",
        "chunk_index": 0,
        "text": (
            "Under §401.021 of the Texas Labor Code, every employer engaged "
            "in business in this state, with three or more employees, is "
            "required to maintain workers compensation coverage. The "
            "minimum payroll threshold for the 2026 policy year is set at "
            "$57,200 per covered employee, with class-code-specific "
            "adjustments published in the official rating manual."
        ),
    },
    {
        "chunk_id": "chunk-2",
        "chunk_index": 1,
        "text": (
            "Carriers writing workers compensation in Texas must file all "
            "rate changes with the Department of Insurance no fewer than "
            "30 calendar days before the proposed effective date. Filings "
            "are deemed approved after 60 calendar days unless the "
            "Commissioner explicitly disapproves."
        ),
    },
]

_QUESTION = "What is the minimum payroll threshold for Texas WC in 2026?"


def _build_system_prompt() -> str:
    citations_block = "\n\n".join(
        f'[chunk_id={c["chunk_id"]} doc="{_DOCUMENT_TITLE}" idx={c["chunk_index"]}]\n{c["text"]}'
        for c in _CHUNKS
    )
    return (
        "You are RuleSense, an AI assistant for regulatory compliance "
        "in the insurance industry. Answer the user's question using ONLY "
        "the cited material below. After every sentence that uses a "
        "citation, append the marker [chunk_id=...]. If the answer is "
        "not present in the cited material, say so explicitly.\n\n"
        "CITED MATERIAL:\n\n"
        f"{citations_block}\n"
    )


# ---------------------------------------------------------------------------
# Anthropic verification
# ---------------------------------------------------------------------------


async def _check_anthropic() -> bool:
    print("\n── Anthropic (RuleSense chat) ──────────────────────────────────")
    print(f"   Question: {_QUESTION}")
    print("   Streaming response:")
    print("   " + "-" * 60)

    collected = ""
    usage = None
    error_msg = None

    async for event in stream_chat(
        messages=[{"role": "user", "content": _QUESTION}],
        system=_build_system_prompt(),
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
    ):
        if event["type"] == "token":
            sys.stdout.write(event["text"])
            sys.stdout.flush()
            collected += event["text"]
        elif event["type"] == "done":
            usage = event.get("usage")
        elif event["type"] == "error":
            error_msg = event.get("message")

    print("\n   " + "-" * 60)

    if error_msg:
        print(f"   FAIL: {error_msg}")
        return False

    if not collected.strip():
        print("   FAIL: empty response")
        return False

    cited_facts = ["57,200", "401.021"]
    found = [f for f in cited_facts if f in collected]
    has_marker = "chunk_id" in collected or "chunk-" in collected

    print(f"   Cited facts present : {found}")
    print(f"   Citation marker     : {has_marker}")
    if usage:
        print(
            f"   Tokens              : input={usage.get('input_tokens')} "
            f"output={usage.get('output_tokens')}"
        )
    print("   PASS: Anthropic streaming chat is working")
    return True


# ---------------------------------------------------------------------------
# OpenAI embeddings verification
# ---------------------------------------------------------------------------


async def _check_openai_embeddings() -> bool:
    print("\n── OpenAI (embeddings / RAG) ───────────────────────────────────")
    sample_text = "Texas workers compensation payroll threshold 2026"
    print(f"   Input text: {sample_text!r}")

    try:
        client = EmbeddingClient()
        vector = await client.embed_single(sample_text)
    except Exception as exc:
        print(f"   FAIL: {exc}")
        return False

    if not vector or len(vector) < 100:
        print(f"   FAIL: suspicious vector (len={len(vector)})")
        return False

    magnitude = sum(x * x for x in vector) ** 0.5
    print(f"   Vector dimensions   : {len(vector)}")
    print(f"   L2 magnitude        : {magnitude:.4f}")
    print("   PASS: OpenAI embeddings are working")
    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main() -> bool:
    print("=" * 72)
    print("RegNav.AI — LLM connectivity verification")
    print("=" * 72)

    anthropic_ok = await _check_anthropic()
    openai_ok = await _check_openai_embeddings()

    print("\n" + "=" * 72)
    print("Results:")
    print(f"  Anthropic (RuleSense chat)       : {'PASS' if anthropic_ok else 'FAIL'}")
    print(f"  OpenAI (embeddings / RAG)        : {'PASS' if openai_ok else 'FAIL'}")
    print("=" * 72)

    if anthropic_ok and openai_ok:
        print("\nAll checks passed. The system is ready for use.")
    else:
        print("\nOne or more checks failed.")
        print("  • Get an Anthropic key at: https://console.anthropic.com")
        print("  • Get an OpenAI key at:    https://platform.openai.com/api-keys")
        print(
            "  • Set as env vars or store in Azure Key Vault as secrets\n"
            "    'anthropic-api-key' and 'openai-api-key'."
        )

    return anthropic_ok and openai_ok


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
