"""Summarization service. Compresses long chat history into a `summary` memory
slice so the system prompt never grows uncontrollably."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Iterable

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user
from app.core.crypto import decrypt
from app.db import mongo
from app.providers import get_provider
from app.providers.base import ChatMessage, ChatRequest
from app.services.audit import log_action

log = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


SUMMARIZE_PROMPT = (
    "You compress a chat history into a single concise summary (max 220 words) "
    "that preserves the user's goals, decisions, open questions, named entities, "
    "and any code or file references. Output ONLY the summary. No preamble."
)


async def _pick_model(model_id: str | None, user_id: ObjectId) -> dict:
    if model_id:
        m = await mongo.models_col().find_one({"_id": ObjectId(model_id)})
        if m and m.get("enabled"):
            return m
    m = await mongo.models_col().find_one({"enabled": True, "provider": "groq"})
    if not m:
        m = await mongo.models_col().find_one({"enabled": True})
    if not m:
        raise HTTPException(400, "no model available")
    return m


@router.post("/conversations/{cid}/summarize", status_code=201)
async def summarize(cid: str, user=Depends(current_user)) -> dict:
    conv = await mongo.conversations().find_one({"_id": ObjectId(cid), "userId": user["_id"]})
    if not conv:
        raise HTTPException(404, "conversation not found")
    msgs = await mongo.messages().find({"conversationId": conv["_id"]}).sort("createdAt", 1).to_list(length=400)
    if len(msgs) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "conversation too short to summarize")

    model_doc = await _pick_model(None, user["_id"])
    api_key = decrypt(model_doc.get("encryptedApiKey") or "")
    if not api_key and model_doc["provider"] != "ollama":
        raise HTTPException(400, "no model with API key available")

    history_text = "\n\n".join(
        f"[{m['role']}] {m['content'][:2000]}" for m in msgs[-200:]
    )
    req = ChatRequest(
        model=model_doc["name"],
        messages=[ChatMessage(role="user", content=history_text)],
        system_prompt=SUMMARIZE_PROMPT,
        temperature=0.2,
        max_tokens=600,
        stream=False,
        user=str(user["_id"]),
    )
    provider = get_provider(model_doc["provider"], api_key=api_key, endpoint=model_doc.get("endpoint"))
    summary, _ = await provider.complete(req)

    now = datetime.now(tz=timezone.utc)
    # remove old summaries for this conversation
    await mongo.memories().delete_many({"userId": user["_id"], "kind": "summary", "source": f"conversation:{cid}"})
    mem_doc = {
        "userId": user["_id"],
        "kind": "summary",
        "content": summary.strip(),
        "weight": 2.0,
        "source": f"conversation:{cid}",
        "createdAt": now,
        "lastUsedAt": None,
    }
    res = await mongo.memories().insert_one(mem_doc)
    await mongo.conversation_summaries().insert_one({
        "conversationId": conv["_id"],
        "userId": user["_id"],
        "summary": summary.strip(),
        "uptoMessageId": msgs[-1]["_id"],
        "createdAt": now,
    })
    await log_action(actor_id=str(user["_id"]), action="chat.summarize", resource=f"conversation:{cid}")
    return {
        "id": str(res.inserted_id),
        "summary": summary.strip(),
        "messages": len(msgs),
        "model": model_doc["name"],
    }
