"""Centralised settings. All env access goes through here."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Core ----
    env: Literal["development", "staging", "production"] = "development"
    app_name: str = "WormGPT"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    log_level: str = "INFO"

    # ---- Database / cache ----
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "wormgpt"
    redis_url: str = "redis://localhost:6379/0"
    redis_password: str | None = None

    # ---- Auth ----
    jwt_secret: str = "change-me-please-this-is-not-secure"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_day: int = 14
    csrf_secret: str = "change-csrf-too"
    cookie_secure: bool = True

    # ---- Encryption ----
    encryption_key: str = ""

    # ---- Providers ----
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    ollama_base_url: str = "http://localhost:11434"

    # ---- Web search ----
    web_search_provider: str = "duckduckgo"
    serper_api_key: str = ""
    tavily_api_key: str = ""

    # ---- Limits ----
    rate_limit_per_min: int = 120
    max_upload_mb: int = 20
    max_context_tokens: int = 32_000

    # ---- Bootstrap admin ----
    bootstrap_admin_email: str = "admin@falaki-ai.pages.dev"
    bootstrap_admin_password: str = "Admin123!"
    bootstrap_admin_username: str = "admin"

    @field_validator("jwt_secret", "csrf_secret", "encryption_key")
    @classmethod
    def _warn_default(cls, v: str, info) -> str:  # noqa: ANN001
        if v.startswith("change") or v.startswith("replace"):
            import logging
            logging.getLogger("wormgpt.config").warning(
                "settings.%s is using an insecure default; set it in .env", info.field_name
            )
        return v

    @field_validator("jwt_secret")
    @classmethod
    def _reject_default_in_prod(cls, v: str) -> str:
        if v.startswith("change") or v.startswith("replace"):
            import logging
            logging.getLogger("wormgpt.config").warning(
                "jwt_secret is still using default value; this is INSECURE in production"
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
