import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError(
        "MONGODB_URI n'est pas configurée dans .env"
    )

client = MongoClient(MONGODB_URI)

db = client["intelligent_document_extractor"]

invoices_collection = db["invoices"]


def test_database_connection():
    try:
        client.admin.command("ping")
        print("MongoDB Atlas connecté avec succès !")
    except Exception as e:
        print(f"Erreur MongoDB : {e}")


def save_invoice(invoice_data: dict, filename: str):
    document = {
        "filename": filename,
        "invoice": invoice_data
    }

    result = invoices_collection.insert_one(document)

    return str(result.inserted_id)

def get_all_invoices():
    invoices = list(
        invoices_collection.find().sort("_id", -1)
    )

    for invoice in invoices:
        invoice["id"] = str(invoice.pop("_id"))

    return invoices

def get_invoice_by_id(invoice_id: str):
    try:
        invoice = invoices_collection.find_one(
            {"_id": ObjectId(invoice_id)}
        )

        if invoice is None:
            return None

        invoice["id"] = str(invoice.pop("_id"))

        return invoice

    except Exception:
        return None


def delete_invoice(invoice_id: str):
    try:
        result = invoices_collection.delete_one(
            {"_id": ObjectId(invoice_id)}
        )

        return result.deleted_count > 0

    except Exception:
        return False

def update_invoice(invoice_id: str, invoice_data: dict):
    try:
        result = invoices_collection.update_one(
            {"_id": ObjectId(invoice_id)},
            {
                "$set": {
                    "invoice": invoice_data
                }
            }
        )

        return result.modified_count > 0

    except Exception:
        return False

    # Collection des comptes utilisateurs
users_collection = db["users"]

# Chaque adresse email doit être unique
users_collection.create_index("email", unique=True)


def save_face_template(user_id: str, template: list[float]) -> bool:
    """Enregistre le gabarit facial du compte utilisateur."""
    from bson import ObjectId

    if not ObjectId.is_valid(user_id):
        return False

    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"face_template": template}},
    )

    return result.matched_count == 1
