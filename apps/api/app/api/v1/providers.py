"""Provider keys management: CRUD + auto-import of models."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user
from app.core.crypto import decrypt, encrypt
from app.db import mongo
from app.models.models import ProviderKeyCreate, ProviderKeyOut
from app.providers import get_provider, reset_registry
from app.services.audit import log_action

log = logging.getLogger(__name__)
router = APIRouter(prefix="/providers", tags=["providers"])


def _to_out(doc: dict) -> ProviderKeyOut:
    return ProviderKeyOut(
        id=str(doc["_id"]),
        provider=doc["provider"],
        endpoint=doc.get("endpoint"),
        status=doc.get("status", "pending"),
        hasApiKey=bool(doc.get("encryptedApiKey")),
        lastSyncAt=doc.get("lastSyncAt"),
        modelsImported=doc.get("modelsImported", 0),
        createdAt=doc.get("createdAt") or datetime.now(tz=timezone.utc),
        updatedAt=doc.get("updatedAt") or datetime.now(tz=timezone.utc),
    )


async def _require_dev(user: dict) -> None:
    if user.get("role") not in ("developer", "admin", "superadmin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "developer/admin only")


async def _import_models(provider_name: str, api_key: str, endpoint: str | None) -> tuple[int, str]:
    """Fetch models from the provider API and create model records (disabled by default).
    Returns (count, status) where status is 'active' or 'error'."""
    try:
        prov = get_provider(provider_name, api_key=api_key, endpoint=endpoint)
        model_ids = await prov.list_models()
    except Exception as e:
        log.exception("provider.import.error provider=%s err=%s", provider_name, e)
        return 0, "error"

    if not model_ids:
        return 0, "active"

    now = datetime.now(tz=timezone.utc)
    encrypted_key = encrypt(api_key)
    imported = 0
    for mid in model_ids:
        # Skip if model with same name+provider already exists
        existing = await mongo.models_col().find_one({"name": mid, "provider": provider_name})
        if existing:
            continue
        doc: dict[str, Any] = {
            "name": mid,
            "provider": provider_name,
            "endpoint": endpoint,
            "encryptedApiKey": encrypted_key,
            "temperature": 0.7,
            "maxTokens": 4096,
            "topP": 1.0,
            "enabled": False,
            "description": f"Auto-imported from {provider_name}",
            "tags": [provider_name, "imported"],
            "createdAt": now,
            "updatedAt": now,
        }
        try:
            await mongo.models_col().insert_one(doc)
            imported += 1
        except Exception:
            # Duplicate or other DB error — skip
            pass
    return imported, "active"


@router.get("", response_model=list[ProviderKeyOut])
async def list_providers(user=Depends(current_user)) -> list[ProviderKeyOut]:
    await _require_dev(user)
    docs = await mongo.provider_keys().find().sort("provider", 1).to_list(length=50)
    return [_to_out(d) for d in docs]


@router.post("", response_model=ProviderKeyOut, status_code=status.HTTP_201_CREATED)
async def create_provider(payload: ProviderKeyCreate, user=Depends(current_user)) -> ProviderKeyOut:
    await _require_dev(user)
    now = datetime.now(tz=timezone.utc)

    # Try to import models
    imported, sync_status = await _import_models(payload.provider, payload.apiKey, payload.endpoint)

    # Upsert: update if provider already exists
    existing = await mongo.provider_keys().find_one({"provider": payload.provider})
    if existing:
        updates: dict[str, Any] = {
            "encryptedApiKey": encrypt(payload.apiKey),
            "endpoint": payload.endpoint,
            "status": sync_status,
            "lastSyncAt": now,
            "modelsImported": (existing.get("modelsImported", 0) + imported),
            "updatedAt": now,
        }
        await mongo.provider_keys().update_one({"_id": existing["_id"]}, {"$set": updates})
        reset_registry()
        fresh = await mongo.provider_keys().find_one({"_id": existing["_id"]})
        await log_action(actor_id=str(user["_id"]), action="provider.update", resource=f"provider:{payload.provider}")
    else:
        doc: dict[str, Any] = {
            "provider": payload.provider,
            "encryptedApiKey": encrypt(payload.apiKey),
            "endpoint": payload.endpoint,
            "status": sync_status,
            "lastSyncAt": now,
            "modelsImported": imported,
            "createdBy": user["_id"],
            "createdAt": now,
            "updatedAt": now,
        }
        result = await mongo.provider_keys().insert_one(doc)
        doc["_id"] = result.inserted_id
        reset_registry()
        fresh = doc
        await log_action(actor_id=str(user["_id"]), action="provider.create", resource=f"provider:{payload.provider}")

    return _to_out(fresh)


@router.delete("/{provider}", status_code=204)
async def delete_provider(provider: str, user=Depends(current_user)) -> None:
    await _require_dev(user)
    res = await mongo.provider_keys().delete_one({"provider": provider})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "provider not configured")
    reset_registry()
    await log_action(actor_id=str(user["_id"]), action="provider.delete", resource=f"provider:{provider}")


@router.post("/{provider}/sync", response_model=ProviderKeyOut)
async def sync_provider(provider: str, user=Depends(current_user)) -> ProviderKeyOut:
    """Re-fetch models from the provider API."""
    await _require_dev(user)
    doc = await mongo.provider_keys().find_one({"provider": provider})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "provider not configured")

    api_key = decrypt(doc.get("encryptedApiKey") or "")
    if not api_key and provider != "ollama":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no API key stored for this provider")

    imported, sync_status = await _import_models(provider, api_key, doc.get("endpoint"))
    now = datetime.now(tz=timezone.utc)
    await mongo.provider_keys().update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": sync_status,
            "lastSyncAt": now,
            "modelsImported": (doc.get("modelsImported", 0) + imported),
            "updatedAt": now,
        }},
    )
    fresh = await mongo.provider_keys().find_one({"_id": doc["_id"]})
    await log_action(actor_id=str(user["_id"]), action="provider.sync", resource=f"provider:{provider}")
    return _to_out(fresh)


@router.post("/{provider}/test")
async def test_provider(provider: str, user=Depends(current_user)) -> dict:
    """Validate the provider key by attempting to list models."""
    await _require_dev(user)
    doc = await mongo.provider_keys().find_one({"provider": provider})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "provider not configured")

    api_key = decrypt(doc.get("encryptedApiKey") or "")
    try:
        prov = get_provider(provider, api_key=api_key, endpoint=doc.get("endpoint"))
        model_ids = await prov.list_models()
    except Exception as e:
        return {"ok": False, "error": str(e)}

    # Update status
    sync_status = "active" if model_ids else "error"
    await mongo.provider_keys().update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": sync_status, "updatedAt": datetime.now(tz=timezone.utc)}},
    )
    return {"ok": True, "modelsFound": len(model_ids), "models": model_ids}
