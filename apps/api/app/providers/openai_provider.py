"""OpenAI provider."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import AsyncOpenAI

from app.providers.base import BaseProvider, ChatChunk, ChatRequest, Usage

log = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self, api_key: str, base_url: str | None = None, **kw: Any) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("OpenAI API key required")
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def stream(self, req: ChatRequest) -> AsyncIterator[ChatChunk]:
        messages: list[dict[str, Any]] = []
        if req.system_prompt:
            messages.append({"role": "system", "content": req.system_prompt})
        for m in req.messages:
            messages.append({"role": m.role, "content": m.content})
        try:
            stream = await self.client.chat.completions.create(
                model=req.model,
                messages=messages,  # type: ignore[arg-type]
                temperature=req.temperature,
                max_tokens=req.max_tokens,
                top_p=req.top_p,
                stop=req.stop,
                stream=True,
                user=req.user,
            )
            async for event in stream:
                choice = (event.choices or [None])[0]
                if choice is None:
                    continue
                delta = (choice.delta.content or "") if choice.delta else ""
                yield ChatChunk(delta=delta, finish_reason=choice.finish_reason)
        except Exception as e:
            log.exception("openai.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        try:
            resp = await self.client.models.list()
            return sorted([m.id for m in resp.data])
        except Exception as e:
            log.exception("openai.list_models.error err=%s", e)
            return []
