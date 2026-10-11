
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv()

password_hasher = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY absente du fichier .env du backend."
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    """Stocke uniquement le hachage du mot de passe."""

    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Vérifie le mot de passe sans le stocker en clair."""

    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: str, email: str) -> str:
    """Crée un jeton de session de courte durée."""

    now = datetime.now(timezone.utc)

    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Vérifie le jeton et renvoie ses informations."""

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )
