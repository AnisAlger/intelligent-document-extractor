
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.database import users_collection


router = APIRouter(prefix="/auth", tags=["Authentification"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


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
