"""Anthropic Claude provider."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from anthropic import AsyncAnthropic

from app.providers.base import BaseProvider, ChatChunk, ChatRequest

log = logging.getLogger(__name__)

# Anthropic doesn't expose a models listing API; maintain a curated list.
KNOWN_ANTHROPIC_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
]


class AnthropicProvider(BaseProvider):
    name = "anthropic"

    def __init__(self, api_key: str, **kw: Any) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("Anthropic API key required")
        self.client = AsyncAnthropic(api_key=api_key)

    async def stream(self, req: ChatRequest) -> AsyncIterator[ChatChunk]:
        system = req.system_prompt or ""
        messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role != "system"]
        try:
            async with self.client.messages.stream(
                model=req.model,
                system=system,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=req.max_tokens,
                temperature=req.temperature,
                top_p=req.top_p,
            ) as stream:
                async for text in stream.text_stream:
                    yield ChatChunk(delta=text)
                yield ChatChunk(delta="", finish_reason="stop")
        except Exception as e:
            log.exception("anthropic.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        return list(KNOWN_ANTHROPIC_MODELS)
