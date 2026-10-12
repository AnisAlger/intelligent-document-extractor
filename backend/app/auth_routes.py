from datetime import datetime, timezone

import jwt
from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File, 
    UploadFile,
    Form
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError
from app.face_verification import (
    extract_face_template,
    compare_face_to_template,
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

        return {
            "id": str(user["_id"]),
            "email": user["email"],
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

        result = compare_face_to_template(
            image_bytes,
            user["face_template"],
        )

        return {
            "success": True,
            "message": "Comparaison faciale effectuée.",
            "user_id": str(user["_id"]),
            "comparison": result,
            "authenticated": False,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    finally:
        await selfie.close()
