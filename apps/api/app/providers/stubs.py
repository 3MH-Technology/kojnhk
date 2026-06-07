"""Real provider implementations for Gemini, DeepSeek, Qwen, and Ollama.

Each provider subclasses BaseProvider and exposes async stream() + complete().
They fall back to a stub error message only when the API key is missing.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.providers.base import BaseProvider, ChatChunk, ChatRequest, Usage

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Google Gemini
# ---------------------------------------------------------------------------
class GeminiProvider(BaseProvider):
    """Google Gemini via google-generativeai (async)."""

    name = "gemini"

    def __init__(self, api_key: str, base_url: str | None = None, **kw: Any) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("Gemini API key required")
        self._api_key = api_key

    def _configure(self) -> Any:
        import google.generativeai as genai

        genai.configure(api_key=self._api_key)
        return genai

    @staticmethod
    def _map_messages(req: ChatRequest) -> list[dict[str, Any]]:
        contents: list[dict[str, Any]] = []
        for m in req.messages:
            role = "model" if m.role == "assistant" else "user"
            contents.append({"role": role, "parts": [m.content]})
        return contents

    async def stream(self, req: ChatRequest) -> AsyncIterator[ChatChunk]:
        try:
            genai = self._configure()

            gen_cfg = genai.types.GenerationConfig(
                temperature=req.temperature,
                top_p=req.top_p,
                max_output_tokens=req.max_tokens,
            )

            model = genai.GenerativeModel(
                model_name=req.model,
                generation_config=gen_cfg,
                system_instruction=req.system_prompt or None,
            )

            contents = self._map_messages(req)
            response = await model.generate_content_async(
                contents,
                stream=True,
            )

            async for chunk in response:
                text = chunk.text or ""
                if text:
                    yield ChatChunk(delta=text)

            yield ChatChunk(delta="", finish_reason="stop")

        except Exception as e:
            log.exception("gemini.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        try:
            genai = self._configure()
            models = []
            async for m in genai.list_models():
                if "generateContent" in (getattr(m, "supported_generation_methods", []) or []):
                    name = m.name.replace("models/", "") if m.name.startswith("models/") else m.name
                    models.append(name)
            return sorted(models)
        except Exception as e:
            log.exception("gemini.list_models.error err=%s", e)
            return []


# ---------------------------------------------------------------------------
# DeepSeek (OpenAI-compatible)
# ---------------------------------------------------------------------------
class DeepSeekProvider(BaseProvider):
    """DeepSeek via OpenAI-compatible API."""

    name = "deepseek"
    _DEFAULT_BASE_URL = "https://api.deepseek.com/v1"

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        **kw: Any,
    ) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("DeepSeek API key required")
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or self._DEFAULT_BASE_URL,
        )

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
            log.exception("deepseek.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        try:
            resp = await self.client.models.list()
            return sorted([m.id for m in resp.data])
        except Exception as e:
            log.exception("deepseek.list_models.error err=%s", e)
            return []


# ---------------------------------------------------------------------------
# Qwen / DashScope (OpenAI-compatible)
# ---------------------------------------------------------------------------
class QwenProvider(BaseProvider):
    """Alibaba Qwen via DashScope OpenAI-compatible API."""

    name = "qwen"
    _DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        **kw: Any,
    ) -> None:
        super().__init__(**kw)
        if not api_key:
            raise ValueError("Qwen / DashScope API key required")
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or self._DEFAULT_BASE_URL,
        )

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
            log.exception("qwen.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        try:
            resp = await self.client.models.list()
            return sorted([m.id for m in resp.data])
        except Exception as e:
            log.exception("qwen.list_models.error err=%s", e)
            return []


# ---------------------------------------------------------------------------
# Ollama (local, OpenAI-compatible)
# ---------------------------------------------------------------------------
class OllamaProvider(BaseProvider):
    """Ollama local inference via OpenAI-compatible endpoint."""

    name = "ollama"
    _DEFAULT_BASE_URL = "http://localhost:11434/v1"

    def __init__(
        self,
        api_key: str = "ollama",
        base_url: str | None = None,
        **kw: Any,
    ) -> None:
        super().__init__(**kw)
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=api_key or "ollama",
            base_url=base_url or self._DEFAULT_BASE_URL,
        )

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
            )
            async for event in stream:
                choice = (event.choices or [None])[0]
                if choice is None:
                    continue
                delta = (choice.delta.content or "") if choice.delta else ""
                yield ChatChunk(delta=delta, finish_reason=choice.finish_reason)
        except Exception as e:
            log.exception("ollama.stream.error model=%s err=%s", req.model, e)
            yield ChatChunk(delta=f"\n\n[Error: {type(e).__name__}: {e}]", finish_reason="error")

    async def list_models(self) -> list[str]:
        try:
            resp = await self.client.models.list()
            return sorted([m.id for m in resp.data])
        except Exception as e:
            log.exception("ollama.list_models.error err=%s", e)
            return []
