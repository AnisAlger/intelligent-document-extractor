
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

password = "MotDePasseTest-123!"

password_hash = hash_password(password)

assert password_hash != password
assert verify_password(password, password_hash)
assert not verify_password("MauvaisMotDePasse", password_hash)

token = create_access_token(
    user_id="test-user-001",
    email="test@example.com",
)

payload = decode_access_token(token)

assert payload["sub"] == "test-user-001"
assert payload["email"] == "test@example.com"

print("Hachage du mot de passe : OK")
print("Vérification du mot de passe : OK")
print("Création et vérification du JWT : OK")
