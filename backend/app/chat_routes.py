"""
Routes chatbot :
  POST /chat/message  → OpenRouter (GPT-4o-mini) répond en FR ou AR
  POST /chat/tts      → OpenRouter ElevenLabs TTS → MP3 audio stream
"""

import os
import io
import logging
from typing import Optional

import requests as http_requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel, Field

from app.auth_routes import get_authenticated_user

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chatbot"])

# ─── OpenRouter client (même clé que pour l'extraction de factures) ───────────
_openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
_openrouter_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=_openrouter_key,
)

_OPENROUTER_TTS_URL = "https://openrouter.ai/api/v1/audio/speech"

# ─── Contexte système (FR/AR bilingue) ────────────────────────────────────────
_SYSTEM_PROMPT = """
Tu es l'assistant intelligent de la plateforme « Intelligent Document Extractor ».

Cette plateforme permet de :
1. Extraire automatiquement les données des factures (PDF, PNG, JPEG) via OCR + IA.
2. S'authentifier de manière sécurisée (email / mot de passe + face recognition).
3. Soumettre une pièce d'identité (carte nationale + selfie) pour vérification.
4. Consulter l'historique des factures extraites.
5. (Administrateurs uniquement) Examiner et valider/rejeter les dossiers d'identité.

Règles absolues :
- Tu détectes automatiquement la langue du message (français ou arabe) et tu réponds dans la même langue.
- Tu es concis, professionnel et bienveillant.
- Tu n'inventes aucune information sur la plateforme.
- Si la question dépasse ton périmètre, tu le dis clairement et tu orientes l'utilisateur.
- Tu ne mentionnes jamais les noms des API ou bibliothèques internes (OpenAI, OpenRouter, ElevenLabs…).

Formules de politesse :
- En français : « Bonjour, je suis votre assistant. »
- En arabe : « مرحباً، أنا مساعدك الذكي. »
"""

# ─── Pydantic models ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=30)
    is_admin: Optional[bool] = False

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/message")
async def chat_message(
    body: ChatRequest,
    user=Depends(get_authenticated_user),
):
    """
    Reçoit l'historique des messages et retourne la réponse de l'IA.
    Accessible à tous les utilisateurs authentifiés.
    """
    if not _openrouter_key:
        raise HTTPException(
            status_code=503,
            detail="Le service de chat n'est pas configuré (clé OpenRouter manquante).",
        )

    # Construire le contexte admin si nécessaire
    admin_suffix = ""
    if body.is_admin:
        admin_suffix = (
            "\n\nNote : Cet utilisateur est un ADMINISTRATEUR. "
            "Tu peux l'aider sur la gestion des dossiers d'identité "
            "(consultation, validation, rejet) et sur les statistiques."
        )

    messages_payload = [
        {"role": "system", "content": _SYSTEM_PROMPT + admin_suffix},
    ]
    for msg in body.messages:
        if msg.role in ("user", "assistant"):
            messages_payload.append({"role": msg.role, "content": msg.content})

    try:
        response = _openrouter_client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=messages_payload,
            max_tokens=600,
            temperature=0.6,
        )
        reply = response.choices[0].message.content or ""
        return {"reply": reply.strip()}

    except Exception as exc:
        logger.error("Erreur OpenRouter chat: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Le service de chat est temporairement indisponible.",
        )


@router.post("/tts")
async def text_to_speech(
    body: TTSRequest,
    user=Depends(get_authenticated_user),
):
    """
    Convertit un texte en audio MP3 via ElevenLabs sur OpenRouter.
    Retourne un stream audio binaire.
    """
    if not _openrouter_key:
        raise HTTPException(
            status_code=503,
            detail="Le service vocal n'est pas configuré (clé OpenRouter manquante).",
        )

    payload = {
        "model": "elevenlabs/eleven-turbo-v2.5",
        "input": body.text[:1000],
        "voice": "george",
        "response_format": "mp3",
    }
    headers = {
        "Authorization": f"Bearer {_openrouter_key}",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    try:
        resp = http_requests.post(
            _OPENROUTER_TTS_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )
        if not resp.ok:
            logger.error(
                "OpenRouter TTS error %s: %s",
                resp.status_code,
                resp.text[:300],
            )
            raise HTTPException(
                status_code=502,
                detail=f"OpenRouter TTS error {resp.status_code}",
            )

        audio_bytes = resp.content
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=reply.mp3",
                "Content-Length": str(len(audio_bytes)),
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Erreur OpenRouter TTS: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Le service vocal est temporairement indisponible.",
        )
