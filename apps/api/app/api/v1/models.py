"""Model management: list, get, create, update, delete."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, public_user  # noqa: F401
from app.core.crypto import decrypt, encrypt
from app.db import mongo
from app.models.models import ModelCreate, ModelOut, ModelUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/models", tags=["models"])


def _to_out(doc: dict, *, prompt_name: str | None = None) -> ModelOut:
    api_key = doc.get("encryptedApiKey") or ""
    has_key = bool(api_key)
    return ModelOut(
        id=str(doc["_id"]),
        name=doc["name"],
        provider=doc["provider"],
        endpoint=doc.get("endpoint"),
        temperature=doc.get("temperature", 0.7),
        maxTokens=doc.get("maxTokens", 4096),
        topP=doc.get("topP", 1.0),
        systemPromptId=str(doc["systemPromptId"]) if doc.get("systemPromptId") else None,
        systemPromptName=prompt_name,
        enabled=doc.get("enabled", True),
        description=doc.get("description"),
        displayName=doc.get("displayName"),
        avatar=doc.get("avatar"),
        tags=doc.get("tags", []),
        createdAt=doc.get("createdAt") or datetime.now(tz=timezone.utc),
        updatedAt=doc.get("updatedAt") or datetime.now(tz=timezone.utc),
        hasApiKey=has_key,
    )


async def _resolve_prompt_names(docs: list[dict]) -> dict[str, str]:
    """Return {promptId: promptName} for all systemPromptIds in docs."""
    ids = {doc.get("systemPromptId") for doc in docs if doc.get("systemPromptId")}
    if not ids:
        return {}
    prompts = await mongo.system_prompts().find(
        {"_id": {"$in": list(ids)}}, {"name": 1}
    ).to_list(length=500)
    return {str(p["_id"]): p["name"] for p in prompts}


async def _require_admin(user: dict) -> None:
    if user.get("role") not in ("developer", "admin", "superadmin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "developer/admin only")


@router.get("", response_model=list[ModelOut])
async def list_models(user=Depends(current_user)) -> list[ModelOut]:
    """All users see enabled models. Admins see all."""
    query: dict[str, Any] = {}
    if user.get("role") not in ("developer", "admin", "superadmin"):
        query["enabled"] = True
    docs = await mongo.models_col().find(query).sort("name", 1).to_list(length=500)
    prompt_names = await _resolve_prompt_names(docs)
    return [_to_out(d, prompt_name=prompt_names.get(str(d["systemPromptId"]) if d.get("systemPromptId") else "")) for d in docs]


@router.get("/{model_id}", response_model=ModelOut)
async def get_model(model_id: str, user=Depends(current_user)) -> ModelOut:
    doc = await mongo.models_col().find_one({"_id": ObjectId(model_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "model not found")
    if not doc.get("enabled") and user.get("role") not in ("developer", "admin", "superadmin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "model not found")
    prompt_names = await _resolve_prompt_names([doc])
    return _to_out(doc, prompt_name=prompt_names.get(str(doc["systemPromptId"]) if doc.get("systemPromptId") else ""))


@router.post("", response_model=ModelOut, status_code=status.HTTP_201_CREATED)
async def create_model(payload: ModelCreate, user=Depends(current_user)) -> ModelOut:
    await _require_admin(user)
    if await mongo.models_col().find_one({"name": payload.name, "provider": payload.provider}):
        raise HTTPException(status.HTTP_409_CONFLICT, "model with this name already exists for this provider")
    now = datetime.now(tz=timezone.utc)
    doc = payload.model_dump(exclude={"apiKey"})
    if payload.apiKey:
        doc["encryptedApiKey"] = encrypt(payload.apiKey)
    doc["createdAt"] = now
    doc["updatedAt"] = now
    if payload.systemPromptId:
        doc["systemPromptId"] = ObjectId(payload.systemPromptId)
    result = await mongo.models_col().insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(actor_id=str(user["_id"]), action="model.create", resource=f"model:{result.inserted_id}")
    return _to_out(doc)


@router.patch("/{model_id}", response_model=ModelOut)
async def update_model(model_id: str, payload: ModelUpdate, user=Depends(current_user)) -> ModelOut:
    await _require_admin(user)
    doc = await mongo.models_col().find_one({"_id": ObjectId(model_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "model not found")
    updates = payload.model_dump(exclude_none=True)
    if "apiKey" in updates:
        updates["encryptedApiKey"] = encrypt(updates.pop("apiKey") or "")
    if "systemPromptId" in updates and updates["systemPromptId"]:
        updates["systemPromptId"] = ObjectId(updates["systemPromptId"])
    updates["updatedAt"] = datetime.now(tz=timezone.utc)
    await mongo.models_col().update_one({"_id": doc["_id"]}, {"$set": updates})
    fresh = await mongo.models_col().find_one({"_id": doc["_id"]})
    await log_action(actor_id=str(user["_id"]), action="model.update", resource=f"model:{model_id}")
    return _to_out(fresh)


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, user=Depends(current_user)) -> None:
    await _require_admin(user)
    if not ObjectId.is_valid(model_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid id")
    res = await mongo.models_col().delete_one({"_id": ObjectId(model_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "model not found")
    await log_action(actor_id=str(user["_id"]), action="model.delete", resource=f"model:{model_id}")


@router.post("/{model_id}/test")
async def test_model(model_id: str, user=Depends(current_user)) -> dict:
    """Send a tiny prompt and report success/failure. Uses the model's own API key."""
    doc = await mongo.models_col().find_one({"_id": ObjectId(model_id)})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "model not found")
    api_key = decrypt(doc.get("encryptedApiKey") or "")
    if not api_key and doc["provider"] != "ollama":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no API key configured for this model")
    from app.providers import get_provider
    provider = get_provider(doc["provider"], api_key=api_key, endpoint=doc.get("endpoint"))
    from app.providers.base import ChatMessage, ChatRequest
    req = ChatRequest(
        model=doc["name"],
        messages=[ChatMessage(role="user", content="Reply with the single word: pong")],
        max_tokens=8,
        temperature=0,
    )
    text, _ = await provider.complete(req)
    return {"ok": True, "sample": text.strip()[:100]}
