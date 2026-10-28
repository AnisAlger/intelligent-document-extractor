from datetime import datetime, timezone
import os
from typing import Literal
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel, Field
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File, 
    UploadFile,
    Form,
    Query,
)
from fastapi.responses import FileResponse
from pathlib import Path
from uuid import uuid4
from app.id_card_verification import verify_id_card_and_selfie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError
from app.face_verification import (
    extract_face_template,
    compare_face_to_template,
)
from app.liveness_detection import (
    analyze_blink_sequence,
    analyze_head_movement_sequence,
    select_best_face_frame,
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.database import users_collection



router = APIRouter(prefix="/auth", tags=["Authentification"])

bearer_scheme = HTTPBearer()


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")

        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=401,
                detail="Token invalide.",
            )

        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Utilisateur introuvable.",
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Le token a expiré. Connectez-vous à nouveau.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token invalide.",
        )




class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class FaceLoginRequest(BaseModel):
    email: EmailStr

class IdentityReviewRequest(BaseModel):
    status: Literal["verified", "rejected"]
    review_note: str = Field(default="", max_length=500)

PRIVATE_DOCUMENTS_DIR = (
    Path(__file__).resolve().parent.parent
    / "private_identity_documents"
)

PRIVATE_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    """Crée un compte avec un email unique et un mot de passe haché."""

    email = str(data.email).strip().lower()

    user = {
        "email": email,
        "password_hash": hash_password(data.password),
        "face_template": None,
        "created_at": datetime.now(timezone.utc),
        "auth_version": 1,
    }

    try:
        result = users_collection.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Un compte existe déjà avec cette adresse email.",
        )

    user_id = str(result.inserted_id)
    token = create_access_token(user_id, email)

    return {
        "message": "Compte créé avec succès.",
        "user": {
            "id": user_id,
            "email": email,
        },
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/login")
def login(data: LoginRequest):
    """Authentifie un utilisateur avec son email et son mot de passe."""

    email = str(data.email).strip().lower()
    user = users_collection.find_one({"email": email})

    # Même réponse pour un email inconnu et un mot de passe incorrect.
    if not user or not verify_password(
        data.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(str(user["_id"]), user["email"])

    return {
        "message": "Connexion réussie.",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
        },
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=401,
                detail="Token invalide.",
            )

        user = users_collection.find_one(
            {"_id": ObjectId(user_id)}
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Utilisateur introuvable.",
            )

        admin_emails = {
            e.strip().lower()
            for e in os.getenv("ADMIN_EMAILS", "").split(",")
            if e.strip()
        }
        is_admin = user["email"].strip().lower() in admin_emails

        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "is_admin": is_admin,
            "face_registered": user.get("face_template") is not None,
            "created_at": user.get("created_at"),
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Le token a expiré. Connectez-vous à nouveau.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token invalide.",
        )


@router.post("/face/enroll")
async def enroll_face(
    selfie: UploadFile = File(...),
    user=Depends(get_authenticated_user),
):
    if selfie.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=400,
            detail="Utilisez une image JPEG ou PNG.",
        )

    try:
        image_bytes = await selfie.read(8 * 1024 * 1024 + 1)

        if len(image_bytes) > 8 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="L'image dépasse la limite de 8 Mo.",
            )
        identity_verification = user.get("identity_verification", {})

        if identity_verification.get("status") != "verified":
            raise HTTPException(
                status_code=403,
                detail=(
                    "La vérification de l'identité doit être validée "
                    "avant l'enregistrement du gabarit facial."
                ),
            )
        template = extract_face_template(image_bytes)

        result = users_collection.update_one(
            {
                "_id": user["_id"],
                "face_template": None,
            },
            {
                "$set": {
                    "face_template": template,
                    "face_enrolled_at": datetime.now(timezone.utc),
                }
            },
        )

        if result.modified_count != 1:
            raise HTTPException(
                status_code=409,
                detail="Un gabarit facial existe déjà ou le compte doit être vérifié.",
            )

        return {
            "success": True,
            "message": "Gabarit facial enregistré.",
            "face_registered": True,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await selfie.close()
async def require_admin(
    user=Depends(get_authenticated_user),
):
    admin_emails = {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }

    user_email = (user.get("email") or "").strip().lower()

    if not admin_emails or user_email not in admin_emails:
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs.",
        )

    return user

@router.patch("/admin/users/{user_id}/identity-review")
async def review_identity(
    user_id: str,
    decision: IdentityReviewRequest,
    admin=Depends(require_admin),
):
    try:
        target_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Identifiant utilisateur invalide.",
        )

    if target_id == admin["_id"]:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut pas valider sa propre identité.",
        )

    now = datetime.now(timezone.utc)

    result = users_collection.update_one(
        {
            "_id": target_id,
            "identity_verification.status": {
                "$in": ["review_required", "verified", "rejected"]
            },
        },
        {
            "$set": {
                "identity_verification.status": decision.status,
                "identity_verification.verified_at": (
                    now if decision.status == "verified" else None
                ),
                "identity_verification.reviewed_at": now,
                "identity_verification.reviewed_by": str(admin["_id"]),
                "identity_verification.reviewed_by_email": admin.get("email"),
                "identity_verification.review_note": decision.review_note,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail=(
                "Utilisateur introuvable ou vérification "
                "non disponible pour examen."
            ),
        )

    return {
        "success": True,
        "user_id": user_id,
        "status": decision.status,
        "review_note": decision.review_note,
        "reviewed_at": now.isoformat(),
        "message": (
            "Identité validée."
            if decision.status == "verified"
            else "Identité rejetée."
        ),
    }


@router.get("/admin/identity-reviews")
def list_identity_reviews(
    status_filter: str = Query(default="review_required"),
    admin=Depends(require_admin),
):
    """
    Retourne la liste des dossiers de vérification d'identité.
    Permet de filtrer par statut : 'review_required', 'verified', 'rejected', ou 'all'.
    """
    if status_filter == "all":
        query = {"identity_verification.status": {"$exists": True, "$ne": None}}
    else:
        query = {"identity_verification.status": status_filter}

    documents = users_collection.find(
        query,
        {
            "email": 1,
            "identity_verification": 1,
            "created_at": 1,
        },
    ).sort(
        "identity_verification.submitted_at", -1
    ).limit(100)

    items = []

    for document in documents:
        verification = document.get(
            "identity_verification", {}
        )
        comparison = verification.get(
            "face_comparison", {}
        )
        docs_meta = verification.get(
            "documents", {}
        )
        ocr_meta = verification.get(
            "ocr", {}
        )

        submitted_at = verification.get("submitted_at")
        reviewed_at = verification.get("reviewed_at")

        user_id_str = str(document["_id"])
        has_id_card = bool(docs_meta.get("id_card_filename"))
        has_selfie = bool(docs_meta.get("selfie_filename"))

        items.append({
            "user_id": user_id_str,
            "email": document.get("email"),
            "status": verification.get("status"),
            "submitted_at": (
                submitted_at.isoformat()
                if submitted_at else None
            ),
            "reviewed_at": (
                reviewed_at.isoformat()
                if reviewed_at else None
            ),
            "review_note": verification.get("review_note", ""),
            "id_card_checked": verification.get(
                "id_card_checked", False
            ),
            "face_match_checked": verification.get(
                "face_match_checked", False
            ),
            "comparison_score": comparison.get(
                "comparison_score"
            ),
            "score_type": comparison.get("score_type"),
            "documents": {
                "has_id_card": has_id_card,
                "has_selfie": has_selfie,
                "id_card_url": (
                    f"/auth/admin/users/{user_id_str}/documents/id_card"
                    if has_id_card else None
                ),
                "selfie_url": (
                    f"/auth/admin/users/{user_id_str}/documents/selfie"
                    if has_selfie else None
                ),
            },
            "ocr": {
                "text_detected": ocr_meta.get("text_detected", False),
                "text": ocr_meta.get("text", ""),
            } if ocr_meta else None,
        })

    return {
        "count": len(items),
        "status_filter": status_filter,
        "items": items,
    }


@router.get("/admin/users/{user_id}/identity-review")
def get_user_identity_review_detail(
    user_id: str,
    admin=Depends(require_admin),
):
    """
    Récupère le détail complet d'un dossier pour examen approfondi par l'administrateur.
    """
    try:
        target_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Identifiant utilisateur invalide.",
        )

    target_user = users_collection.find_one({"_id": target_id})
    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur introuvable.",
        )

    verification = target_user.get("identity_verification") or {}
    if not verification:
        raise HTTPException(
            status_code=404,
            detail="Aucun dossier de vérification d'identité pour cet utilisateur.",
        )

    comparison = verification.get("face_comparison") or {}
    docs_meta = verification.get("documents") or {}
    ocr_meta = verification.get("ocr") or {}

    submitted_at = verification.get("submitted_at")
    reviewed_at = verification.get("reviewed_at")

    has_id_card = bool(docs_meta.get("id_card_filename"))
    has_selfie = bool(docs_meta.get("selfie_filename"))

    return {
        "user_id": str(target_user["_id"]),
        "email": target_user.get("email"),
        "status": verification.get("status", "review_required"),
        "submitted_at": submitted_at.isoformat() if submitted_at else None,
        "reviewed_at": reviewed_at.isoformat() if reviewed_at else None,
        "reviewed_by": verification.get("reviewed_by"),
        "reviewed_by_email": verification.get("reviewed_by_email"),
        "review_note": verification.get("review_note", ""),
        "id_card_checked": verification.get("id_card_checked", False),
        "face_match_checked": verification.get("face_match_checked", False),
        "face_comparison": comparison,
        "ocr": {
            "text_detected": ocr_meta.get("text_detected", False),
            "text": ocr_meta.get("text", ""),
        } if ocr_meta else None,
        "documents": {
            "has_id_card": has_id_card,
            "has_selfie": has_selfie,
            "id_card_url": (
                f"/auth/admin/users/{user_id}/documents/id_card"
                if has_id_card else None
            ),
            "selfie_url": (
                f"/auth/admin/users/{user_id}/documents/selfie"
                if has_selfie else None
            ),
        },
    }


@router.get("/admin/users/{user_id}/documents/{document_type}")
async def get_user_identity_document(
    user_id: str,
    document_type: str,
    admin=Depends(require_admin),
):
    """
    Transmet de manière sécurisée la photo de la carte d'identité ou le selfie
    d'un utilisateur à l'administrateur après vérification stricte de ses droits.
    """
    try:
        target_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Identifiant utilisateur invalide.",
        )

    norm_type = (
        "id_card"
        if document_type in {"id", "id_card", "cni"}
        else ("selfie" if document_type in {"selfie", "photo"} else None)
    )

    if not norm_type:
        raise HTTPException(
            status_code=400,
            detail="Type de document invalide. Utilisez 'id_card' ou 'selfie'.",
        )

    target_user = users_collection.find_one({"_id": target_id})
    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur introuvable.",
        )

    verification = target_user.get("identity_verification") or {}
    documents = verification.get("documents") or {}
    filename = documents.get(f"{norm_type}_filename")

    if not filename:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun fichier enregistré pour le document '{document_type}'.",
        )

    # Protection contre le Path Traversal
    safe_name = Path(filename).name
    file_path = (PRIVATE_DOCUMENTS_DIR / safe_name).resolve()

    if (
        not file_path.is_relative_to(PRIVATE_DOCUMENTS_DIR.resolve())
        or not file_path.is_file()
    ):
        raise HTTPException(
            status_code=404,
            detail="Fichier introuvable sur le serveur.",
        )

    media_type = (
        "image/png"
        if file_path.suffix.lower() == ".png"
        else "image/jpeg"
    )

    # En-têtes stricts de sécurité pour données biométriques et personnelles
    headers = {
        "Cache-Control": (
            "private, no-store, no-cache, must-revalidate, max-age=0"
        ),
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f"inline; filename={safe_name}",
    }

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers,
    )


@router.post("/face/verify")
async def verify_face_login(
    email: EmailStr = Form(...),
    selfie: UploadFile = File(...),
):
    email_normalized = str(email).strip().lower()

    if selfie.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=400,
            detail="Utilisez une image JPEG ou PNG.",
        )

    try:
        image_bytes = await selfie.read(8 * 1024 * 1024 + 1)

        if len(image_bytes) > 8 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="L'image dépasse la limite de 8 Mo.",
            )

        user = users_collection.find_one(
            {"email": email_normalized}
        )

        if not user or user.get("face_template") is None:
            raise HTTPException(
                status_code=401,
                detail="Vérification faciale impossible pour ce compte.",
            )

        score = result.get("comparison_score", 0.0)
        is_matched = score >= 0.40

        if is_matched:
            token = create_access_token(str(user["_id"]), user["email"])
            return {
                "success": True,
                "authenticated": True,
                "message": "Authentification faciale réussie. Bienvenue !",
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": str(user["_id"]),
                    "email": user["email"],
                },
                "comparison": result,
            }

        return {
            "success": False,
            "authenticated": False,
            "message": f"Visage non reconnu (score {score:.2f} < 0.40). Veuillez réessayer.",
            "comparison": result,
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'enregistrement biométrique : {str(exc)}",
        ) from exc

    finally:
        await selfie.close()



@router.post("/face/verify-live")
async def verify_face_live(
    email: EmailStr = Form(...),
    frames: list[UploadFile] = File(...),
):
    email_normalized = str(email).strip().lower()

    if len(frames) < 5 or len(frames) > 30:
        raise HTTPException(
            status_code=400,
            detail="Fournissez entre 5 et 30 images.",
        )

    frame_bytes = []

    try:
        total_size = 0

        for frame in frames:
            if frame.content_type not in {"image/jpeg", "image/png"}:
                raise HTTPException(
                    status_code=400,
                    detail="Toutes les images doivent être en JPEG ou PNG.",
                )

            content = await frame.read(8 * 1024 * 1024 + 1)

            if len(content) > 8 * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail="Une image dépasse la limite de 8 Mo.",
                )

            total_size += len(content)

            if total_size > 20 * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail="La séquence dépasse la limite de 20 Mo.",
                )

            frame_bytes.append(content)

        # Contrôle 1 : clignement des yeux
        blink_result = analyze_blink_sequence(frame_bytes)

        # Contrôle 2 : mouvement horizontal de la tête
        head_result = analyze_head_movement_sequence(frame_bytes)

        blink_ok = (
            blink_result.get("success") is True
            and blink_result.get("blink_detected") is True
        )

        head_ok = (
            head_result.get("success") is True
            and head_result.get("head_movement_detected") is True
        )

        # Les deux contrôles doivent réussir avant la comparaison faciale.
        if not (blink_ok and head_ok):
            return {
                "success": True,
                "message": (
                    "Les contrôles ne sont pas tous concluants. "
                    "Recommencez la capture."
                ),
                "blink_check": blink_result,
                "head_movement_check": head_result,
                "face_comparison": None,
                "authenticated": False,
            }

        # Recherche du compte et du gabarit facial enregistré.
        user = users_collection.find_one(
            {"email": email_normalized}
        )

        if not user or user.get("face_template") is None:
            raise HTTPException(
                status_code=401,
                detail="Aucun gabarit facial enregistré pour ce compte.",
            )

        # Comparaison avec le gabarit enregistré.
        # Attention : la dernière image peut ne pas être la meilleure.

        # Sélectionner la meilleure image parmi toutes les captures.
        selection = select_best_face_frame(frame_bytes)

        if not selection["success"]:
            return {
                "success": True,
                "message": (
                    "Aucune image de qualité suffisante n'a été trouvée. "
                    "Veuillez recommencer la capture."
                ),
                "blink_check": blink_result,
                "head_movement_check": head_result,
                "image_quality": {
                    "success": False,
                    "message": selection["message"],
                    "evaluated_frames": selection["evaluated_frames"],
                },
                "face_comparison": None,
                "authenticated": False,
            }

        best_frame = selection["selected_frame"]

        # Comparer la meilleure image au gabarit enregistré.
        comparison = compare_face_to_template(
            best_frame,
            user["face_template"],
        )

        score = comparison.get("comparison_score", 0.0)
        is_matched = score >= 0.40

        if is_matched:
            token = create_access_token(str(user["_id"]), user["email"])
            return {
                "success": True,
                "authenticated": True,
                "message": "Authentification faciale automatique réussie ! Bienvenue.",
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": str(user["_id"]),
                    "email": user["email"],
                },
                "blink_check": blink_result,
                "head_movement_check": head_result,
                "image_quality": {
                    "success": True,
                    "evaluated_frames": selection["evaluated_frames"],
                    "selected_frame_index": selection["quality"]["frame_index"],
                    "metrics": {
                        "sharpness": selection["quality"]["sharpness"],
                        "face_area_ratio": selection["quality"]["face_area_ratio"],
                        "brightness": selection["quality"]["brightness"],
                        "quality_score": selection["quality"]["quality_score"],
                    },
                },
                "face_comparison": comparison,
            }

        return {
            "success": False,
            "authenticated": False,
            "message": f"Contrôles de mouvement validés mais similarité faciale insuffisante ({score:.2f} < 0.40).",
            "blink_check": blink_result,
            "head_movement_check": head_result,
            "face_comparison": comparison,
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur d'analyse biométrique faciale : {str(exc)}",
        ) from exc

    finally:
        for frame in frames:
            await frame.close()


@router.post("/verify-id-card")
async def verify_identity_for_account(
    id_photo: UploadFile = File(...),
    selfie: UploadFile = File(...),
    user=Depends(get_authenticated_user),
):
    allowed_types = {"image/jpeg", "image/png"}

    if id_photo.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="La carte doit être au format JPEG ou PNG.",
        )

    if selfie.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Le selfie doit être au format JPEG ou PNG.",
        )

    try:
        id_bytes = await id_photo.read(8 * 1024 * 1024 + 1)
        selfie_bytes = await selfie.read(8 * 1024 * 1024 + 1)

        if len(id_bytes) > 8 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="La photo de la carte dépasse 8 Mo.",
            )

        if len(selfie_bytes) > 8 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Le selfie dépasse 8 Mo.",
            )

        if not id_bytes or not selfie_bytes:
            raise HTTPException(
                status_code=400,
                detail="La carte et le selfie sont obligatoires.",
            )

        # Effectuer l'analyse OCR et la comparaison des visages.
        result = verify_id_card_and_selfie(
            id_image_bytes=id_bytes,
            selfie_bytes=selfie_bytes,
        )

        # Ne pas considérer automatiquement la carte comme vérifiée.
        # Une validation fiable de l'identité reste nécessaire.
                # N'utiliser que des noms générés par le serveur.
        document_id = uuid4().hex
        user_id = str(user["_id"])

        id_extension = (
            ".png" if id_photo.content_type == "image/png" else ".jpg"
        )
        selfie_extension = (
            ".png" if selfie.content_type == "image/png" else ".jpg"
        )

        id_filename = f"{user_id}_{document_id}_id{id_extension}"
        selfie_filename = f"{user_id}_{document_id}_selfie{selfie_extension}"

        id_path = PRIVATE_DOCUMENTS_DIR / id_filename
        selfie_path = PRIVATE_DOCUMENTS_DIR / selfie_filename

        # Sauvegarder les octets déjà lus par l'endpoint.
        id_path.write_bytes(id_bytes)
        selfie_path.write_bytes(selfie_bytes)

        verification_record = {
            "status": "review_required",
            "id_card_checked": True,
            "face_match_checked": (
                result.get("face_comparison") is not None
            ),
            "verified_at": None,
            "submitted_at": datetime.now(timezone.utc),
            "face_comparison": result.get("face_comparison"),
            "ocr": result.get("ocr"),
            "documents": {
                "id_card_filename": id_filename,
                "selfie_filename": selfie_filename,
            },
        }

        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "identity_verification": verification_record,
                }
            },
        )

        return {
            "success": True,
            "message": (
                "Analyse terminée. L'identité doit encore être examinée."
            ),
            "identity_verification": {
                "status": verification_record["status"],
                "id_card_checked": verification_record["id_card_checked"],
                "face_match_checked": verification_record[
                    "face_match_checked"
                ],
            },
            "analysis": result,
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la vérification de pièce d'identité : {str(exc)}",
        ) from exc

    finally:
        await id_photo.close()
        await selfie.close()
