"""
Plutus LLM access with provider failover — so one provider being down, rate-limited,
or out of credits never takes the product down (2026-10-27: OpenAI quota ran out and
upload, analysis, disputes and Counsel all failed).

Order: Groq gpt-oss-120b (free) → Groq gpt-oss-20b (free, separate rate-limit bucket)
→ OpenAI gpt-4o-mini (paid, used only when both free models fail). Providers without
a key are skipped. Tested on Plutus's own prompts against a 14-account fake report:
both Groq models extracted 14/14 and returned the analysis schema intact.

Returns the OpenAI-shaped response object, so call sites only swap the client call.
If every provider fails, the last provider's exception is re-raised unchanged, so the
existing RateLimitError / APITimeoutError handling in the routers keeps working.
"""
import logging

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class EmptyCompletionError(RuntimeError):
    """A provider answered with no content — treated as a failure so the next one runs."""


def _build_providers() -> list[tuple[str, OpenAI, str]]:
    providers: list[tuple[str, OpenAI, str]] = []
    if settings.groq_api_key:
        groq = OpenAI(api_key=settings.groq_api_key, base_url=_GROQ_BASE_URL, timeout=60, max_retries=1)
        providers += [("groq", groq, "openai/gpt-oss-120b"), ("groq", groq, "openai/gpt-oss-20b")]
    if settings.openai_api_key:
        providers.append(("openai", OpenAI(api_key=settings.openai_api_key, timeout=60, max_retries=1), "gpt-4o-mini"))
    return providers


_PROVIDERS = _build_providers()


def chat_completion(
    *,
    messages: list[dict],
    max_tokens: int,
    temperature: float | None = None,
    response_format: dict | None = None,
):
    last_exc: Exception | None = None
    for name, client, model in _PROVIDERS:
        kwargs: dict = {"model": model, "messages": messages, "max_tokens": max_tokens}
        if temperature is not None:
            kwargs["temperature"] = temperature
        if response_format:
            kwargs["response_format"] = response_format
        if model.startswith("openai/gpt-oss"):
            # Reasoning model: keep deliberation short so it doesn't eat max_tokens.
            # extra_body, not the kwarg — the pinned openai SDK (1.57) predates it.
            kwargs["extra_body"] = {"reasoning_effort": "low"}
        try:
            response = client.chat.completions.create(**kwargs)
            if not (response.choices and response.choices[0].message.content):
                raise EmptyCompletionError(f"{name}/{model} returned no content")
            return response
        except Exception as exc:
            last_exc = exc
            logger.warning("LLM %s/%s failed (%s) — trying next provider", name, model, type(exc).__name__)
    if last_exc is None:
        raise RuntimeError("No LLM provider configured (set GROQ_API_KEY or OPENAI_API_KEY)")
    raise last_exc
