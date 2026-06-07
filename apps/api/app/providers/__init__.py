"""Provider factory + registry."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.base import BaseProvider
from app.providers.groq import GroqProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.stubs import DeepSeekProvider, GeminiProvider, OllamaProvider, QwenProvider

log = logging.getLogger(__name__)


def _build(provider: str, api_key: str, endpoint: str | None = None) -> BaseProvider:
    p = provider.lower()
    try:
        if p == "groq":
            return GroqProvider(api_key=api_key, base_url=endpoint or get_settings().groq_base_url)
        if p == "openai":
            return OpenAIProvider(api_key=api_key, base_url=endpoint)
        if p == "anthropic":
            return AnthropicProvider(api_key=api_key)
        if p == "gemini":
            return GeminiProvider(api_key=api_key, base_url=endpoint)
        if p == "deepseek":
            return DeepSeekProvider(api_key=api_key, base_url=endpoint or get_settings().deepseek_base_url)
        if p == "qwen":
            return QwenProvider(api_key=api_key, base_url=endpoint or get_settings().qwen_base_url)
        if p == "ollama":
            return OllamaProvider(base_url=endpoint or get_settings().ollama_base_url)
    except ValueError as e:
        log.warning("provider.build.missing_key provider=%s err=%s", provider, e)
    # Fallback stub
    return _StubFor(provider)


class _StubFor(BaseProvider):
    def __init__(self, label: str) -> None:
        super().__init__()
        self.label = label

    async def stream(self, req):  # type: ignore[override]
        from app.providers.base import ChatChunk
        yield ChatChunk(
            delta=f"\n\n[{self.label} provider is not configured.]",
            finish_reason="error",
        )


_registry: dict[str, BaseProvider] = {}


def get_provider(name: str, api_key: str = "", endpoint: str | None = None) -> BaseProvider:
    """Memoised provider instances. Keyed by (provider, key-hash, endpoint)."""
    from hashlib import sha256
    sig = f"{name}|{sha256(api_key.encode()).hexdigest()[:8]}|{endpoint or ''}"
    if sig in _registry:
        return _registry[sig]
    p = _build(name, api_key, endpoint)
    _registry[sig] = p
    return p


def reset_registry() -> None:
    _registry.clear()


__all__ = [
    "BaseProvider",
    "GroqProvider",
    "OpenAIProvider",
    "AnthropicProvider",
    "GeminiProvider",
    "DeepSeekProvider",
    "QwenProvider",
    "OllamaProvider",
    "get_provider",
    "reset_registry",
]
