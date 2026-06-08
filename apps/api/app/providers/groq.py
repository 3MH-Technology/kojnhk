"""Groq provider (real, primary)."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from groq import AsyncGroq

from app.providers.base import BaseProvider, ChatChunk, ChatRequest, Usage

log = logging.getLogger(__name__)


class GroqProvider(BaseProvider):
    name = "groq"

    def __init__(self, api_key: str, base_url: str = "https://api.groq.com", **kw: Any) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("Groq API key required")
        self.client = AsyncGroq(api_key=api_key, base_url=base_url)

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
                finish = choice.finish_reason
                usage_obj = None
                if getattr(event, "x_groq", None) and getattr(event.x_groq, "usage", None):
                    u = event.x_groq.usage
                    usage_obj = Usage(
                        prompt_tokens=getattr(u, "prompt_tokens", 0) or 0,
                        completion_tokens=getattr(u, "completion_tokens", 0) or 0,
                        total_tokens=getattr(u, "total_tokens", 0) or 0,
                    )
                yield ChatChunk(delta=delta, finish_reason=finish, usage=usage_obj)
        except Exception as e:
            log.exception("groq.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        resp = await self.client.models.list()
        return sorted([m.id for m in resp.data])
