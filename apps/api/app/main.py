"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.cache import redis as redis_cache
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import CSRFMiddleware, RequestContextMiddleware, SecurityHeadersMiddleware
from app.core.security import hash_password
from app.db import mongo

configure_logging()
log = logging.getLogger("wormgpt.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mongo.connect()
    await redis_cache.connect()
    await _ensure_indexes()
    await _bootstrap_admin()
    log.info("wormgpt.ready env=%s", settings.env)
    yield
    await mongo.disconnect()
    await redis_cache.disconnect()


async def _ensure_indexes() -> None:
    """Safety net: ensure indexes exist even if mongo.connect skipped them."""
    from app.db.mongo import _ensure_indexes as _db_ensure
    from app.db import mongo
    await _db_ensure(mongo.db())


async def _bootstrap_admin() -> None:
    now = datetime.now(tz=timezone.utc)
    created = 0

    if await mongo.users().count_documents({}) == 0:
        log.warning("no users in db; creating bootstrap accounts")
        doc = {
            "username": settings.bootstrap_admin_username,
            "email": settings.bootstrap_admin_email.lower(),
            "passwordHash": hash_password(settings.bootstrap_admin_password),
            "role": "superadmin",
            "status": "approved",
            "avatar": None,
            "createdAt": now,
            "updatedAt": now,
            "lastLogin": None,
            "failedLoginAttempts": 0,
            "lockedUntil": None,
        }
        await mongo.users().insert_one(doc)
        log.info("bootstrap admin created: %s", settings.bootstrap_admin_email)
        created += 1

    if await mongo.users().count_documents({"email": "developer@teteffd.hf.space"}) == 0:
        await mongo.users().insert_one({
            "username": "developer",
            "email": "developer@teteffd.hf.space",
            "passwordHash": hash_password("Dev123!"),
            "role": "developer",
            "status": "approved",
            "avatar": None,
            "createdAt": now,
            "updatedAt": now,
            "lastLogin": None,
            "failedLoginAttempts": 0,
            "lockedUntil": None,
        })
        log.info("bootstrap developer created")
        created += 1

    if await mongo.system_prompts().count_documents({"name": "WormGPT Default"}) == 0:
        await mongo.system_prompts().insert_one({
            "name": "WormGPT Default",
            "description": "Helpful, accurate, concise assistant.",
            "content": "You are WormGPT, a helpful, accurate, and concise AI assistant. "
                       "When unsure, say you don't know. Cite sources when relevant.",
            "tags": ["general"],
            "active": True,
            "currentVersion": 1,
            "versions": [{
                "version": 1,
                "content": "You are WormGPT, a helpful, accurate, and concise AI assistant. "
                           "When unsure, say you don't know. Cite sources when relevant.",
                "changelog": "initial",
                "createdAt": now,
            }],
            "createdAt": now,
            "updatedAt": now,
        })
        log.info("bootstrap system prompt created")
        created += 1

    if created:
        log.info("bootstrap complete: %d items created", created)


app = FastAPI(
    title="WormGPT API",
    version="0.1.0",
    description="Backend for the WormGPT AI chat platform.",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(CSRFMiddleware)

app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "service": "wormgpt-api",
        "version": "0.1.0",
        "docs": "/api/docs",
    }


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    rid = getattr(request.state, "request_id", None)
    log.exception("unhandled rid=%s err=%s", rid, exc)
    # best-effort persistence so admins can see the most recent server errors
    try:
        from app.db import mongo as _mongo
        from datetime import datetime, timezone
        await _mongo.errors_log().insert_one({
            "kind": "server",
            "message": f"{type(exc).__name__}: {exc}"[:1000],
            "path": str(request.url.path),
            "method": request.method,
            "status": 500,
            "actorId": None,
            "requestId": rid,
            "userAgent": request.headers.get("user-agent"),
            "createdAt": datetime.now(tz=timezone.utc),
        })
    except Exception:
        pass
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "requestId": rid},
        )
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "requestId": rid},
    )
