"""Developer panel endpoints (alias for /models with extra conveniences)."""

from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user
from app.core.crypto import decrypt
from app.db import mongo
from app.models.models import ModelCreate, ModelOut, ModelUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/developer", tags=["developer"])


def _is_dev(user: dict) -> bool:
    return user.get("role") in ("developer", "admin", "superadmin")


@router.get("/models", response_model=list[ModelOut])
async def list_all_models(user=Depends(current_user)) -> list[ModelOut]:
    if not _is_dev(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "developer/admin only")
    docs = await mongo.models_col().find().sort("createdAt", -1).to_list(length=500)
    from app.api.v1.models import _to_out, _resolve_prompt_names
    prompt_names = await _resolve_prompt_names(docs)
    return [_to_out(d, prompt_name=prompt_names.get(str(d["systemPromptId"]) if d.get("systemPromptId") else "")) for d in docs]


@router.post("/models/{model_id}/reveal")
async def reveal_api_key(model_id: str, user=Depends(current_user)) -> dict:
    """Reveal an API key. Logged. Only the superadmin sees plaintext."""
    if user.get("role") != "superadmin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "superadmin only")
    doc = await mongo.models_col().find_one({"_id": ObjectId(model_id)})
    if not doc:
        raise HTTPException(404, "model not found")
    plaintext = decrypt(doc.get("encryptedApiKey") or "")
    await log_action(
        actor_id=str(user["_id"]),
        action="model.reveal_key",
        resource=f"model:{model_id}",
    )
    return {"apiKey": plaintext}
