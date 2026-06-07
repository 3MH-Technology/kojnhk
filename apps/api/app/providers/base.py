"""LLM provider abstraction. All chat completions go through BaseProvider."""

from __future__ import annotations

import abc
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal

MessageRole = Literal["system", "user", "assistant", "tool"]


@dataclass(slots=True)
class ChatMessage:
    role: MessageRole
    content: str
    name: str | None = None
    tool_call_id: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ChatRequest:
    model: str
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 1.0
    stop: list[str] | None = None
    stream: bool = True
    user: str | None = None
    system_prompt: str | None = None


@dataclass(slots=True)
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(slots=True)
class ChatChunk:
    delta: str = ""
    finish_reason: str | None = None
    usage: Usage | None = None
    raw: dict[str, Any] | None = None


class BaseProvider(abc.ABC):
    """Base class for LLM providers. Implementations must be async-first."""

    name: str = "base"

    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs

    @abc.abstractmethod
    async def stream(self, req: ChatRequest) -> AsyncIterator[ChatChunk]:  # pragma: no cover
        ...

    async def complete(self, req: ChatRequest) -> tuple[str, Usage]:
        """Non-streaming helper: collect all chunks and return final text + usage."""
        text_parts: list[str] = []
        usage = Usage()
        async for chunk in self.stream(req):
            if chunk.delta:
                text_parts.append(chunk.delta)
            if chunk.usage:
                usage = chunk.usage
            if chunk.finish_reason:
                break
        return "".join(text_parts), usage

    def count_tokens(self, text: str) -> int:
        """Cheap token estimate. Override for better accuracy."""
        # ~4 chars per token, English bias
        return max(1, len(text) // 4)

    async def list_models(self) -> list[str]:
        """Return available model IDs from the provider API. Override per provider."""
        return []
