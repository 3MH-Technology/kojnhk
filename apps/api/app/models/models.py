"""Model management and system prompt schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Provider = Literal[
    "groq", "openai", "anthropic", "gemini", "deepseek", "qwen", "ollama", "custom"
]


class ModelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    provider: Provider
    endpoint: str | None = None
    apiKey: str | None = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    maxTokens: int = Field(default=4096, ge=1, le=200_000)
    topP: float = Field(default=1.0, ge=0.0, le=1.0)
    systemPromptId: str | None = None
    enabled: bool = True
    description: str | None = None
    displayName: str | None = None
    avatar: str | None = None
    tags: list[str] = Field(default_factory=list)


class ModelUpdate(BaseModel):
    name: str | None = None
    endpoint: str | None = None
    apiKey: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    maxTokens: int | None = Field(default=None, ge=1, le=200_000)
    topP: float | None = Field(default=None, ge=0.0, le=1.0)
    systemPromptId: str | None = None
    enabled: bool | None = None
    description: str | None = None
    displayName: str | None = None
    avatar: str | None = None
    tags: list[str] | None = None


class ModelOut(BaseModel):
    """Public-facing model representation. NEVER includes apiKey."""
    id: str
    name: str
    provider: Provider
    endpoint: str | None = None
    temperature: float
    maxTokens: int
    topP: float
    systemPromptId: str | None = None
    systemPromptName: str | None = None
    enabled: bool
    description: str | None = None
    displayName: str | None = None
    avatar: str | None = None
    tags: list[str]
    createdAt: datetime
    updatedAt: datetime
    hasApiKey: bool = False


class SystemPromptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1, max_length=200_000)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    active: bool = True


class SystemPromptUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    active: bool | None = None
    changelog: str | None = None


class SystemPromptVersion(BaseModel):
    version: int
    content: str
    changelog: str | None = None
    createdAt: datetime


class SystemPromptOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    tags: list[str]
    active: bool
    currentVersion: int
    versions: list[SystemPromptVersion] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime


class SystemPromptSummary(BaseModel):
    """Minimal info for non-admin users (content is NEVER sent)."""
    id: str
    name: str
    description: str | None = None


class ProviderKeyCreate(BaseModel):
    provider: Provider
    apiKey: str = Field(min_length=1)
    endpoint: str | None = None


class ProviderKeyOut(BaseModel):
    id: str
    provider: Provider
    endpoint: str | None = None
    status: str = "pending"
    hasApiKey: bool = True
    lastSyncAt: datetime | None = None
    modelsImported: int = 0
    createdAt: datetime
    updatedAt: datetime
