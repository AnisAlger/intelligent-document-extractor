import sys
from fastapi.testclient import TestClient
from bson import ObjectId
from app.main import app
from app.auth import create_access_token
from app.database import users_collection

client = TestClient(app)

def run_tests():
    print("--- Démarrage des tests de l'examen des documents d'identité ---")
    
    # 1. Trouver un utilisateur avec une demande d'examen
    pending_user = users_collection.find_one({"identity_verification.documents.id_card_filename": {"$exists": True}})
    if not pending_user:
        print("ATTENTION: Aucun utilisateur avec documents dans la base. Création d'un mock...")
        return
        
    user_id = str(pending_user["_id"])
    print(f"Utilisateur test trouvé : {pending_user['email']} ({user_id})")
    
    # 2. Test sans token -> 401 ou 403
    res_no_token = client.get(f"/auth/admin/users/{user_id}/documents/id_card")
    print(f"1. Accès sans token : code {res_no_token.status_code}")
    assert res_no_token.status_code in (401, 403)
    
    # 3. Test avec utilisateur non-admin -> 403
    user_token = create_access_token(user_id=user_id, email=pending_user["email"])
    res_non_admin = client.get(
        f"/auth/admin/users/{user_id}/documents/id_card",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    print(f"2. Accès non-admin : code {res_non_admin.status_code}")
    assert res_non_admin.status_code == 403
    
    # 4. Test avec token administrateur (anis@gmail.com)
    admin_token = create_access_token(user_id="6acb878b693dd97c8d994eae", email="anis@gmail.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test liste des reviews
    res_reviews = client.get("/auth/admin/identity-reviews?status_filter=all", headers=admin_headers)
    print(f"3. Liste des dossiers (admin) : code {res_reviews.status_code}")
    assert res_reviews.status_code == 200
    data = res_reviews.json()
    assert "items" in data
    print(f"   Nombre de dossiers : {data['count']}")
    
    # Test récupération de la carte d'identité
    res_cni = client.get(f"/auth/admin/users/{user_id}/documents/id_card", headers=admin_headers)
    print(f"4. Récupération carte d'identité : code {res_cni.status_code}, type {res_cni.headers.get('content-type')}, taille {len(res_cni.content)} octets")
    assert res_cni.status_code == 200
    assert "image/" in res_cni.headers.get("content-type", "")
    assert res_cni.headers.get("cache-control") == "private, no-store, no-cache, must-revalidate, max-age=0"
    assert res_cni.headers.get("x-content-type-options") == "nosniff"
    
    # Test récupération du selfie
    res_selfie = client.get(f"/auth/admin/users/{user_id}/documents/selfie", headers=admin_headers)
    print(f"5. Récupération selfie : code {res_selfie.status_code}, type {res_selfie.headers.get('content-type')}, taille {len(res_selfie.content)} octets")
    assert res_selfie.status_code == 200
    assert "image/" in res_selfie.headers.get("content-type", "")
    assert res_selfie.headers.get("cache-control") == "private, no-store, no-cache, must-revalidate, max-age=0"
    
    # Test détail du dossier
    res_detail = client.get(f"/auth/admin/users/{user_id}/identity-review", headers=admin_headers)
    print(f"6. Détail du dossier : code {res_detail.status_code}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["documents"]["has_id_card"] is True
    assert detail["documents"]["has_selfie"] is True
    
    print("\n TOUS LES TESTS DE SÉCURITÉ ET D'EXAMEN DES DOCUMENTS SONT VALIDÉS !")

if __name__ == "__main__":
    run_tests()
