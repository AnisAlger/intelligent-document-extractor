from fastapi import FastAPI, UploadFile, File, HTTPException
from app.ocr import (
    extract_text_from_image,
    extract_text_from_pdf
)
from app.id_card_verification import verify_id_card_and_selfie
from app.auth_routes import router as auth_router
import tempfile
from app.liveness_detection import analyze_blink_sequence
from pathlib import Path
from app.ai_extractor import extract_invoice_data
from app.database import (
    save_invoice,
    get_all_invoices,
    get_invoice_by_id,
    delete_invoice,
    update_invoice
)
from app.models import InvoiceData
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.exports import (
    export_invoices_to_excel,
    export_invoices_to_pdf,
)
from app.face_verification import compare_identity_face
import shutil

app = FastAPI(
    title="Intelligent Document Extractor",
    description="API for intelligent extraction of data from invoices",
    version="1.0.0"
)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/")
def root():
    return {
        "message": "Intelligent Document Extractor API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):

    allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilisez PDF, PNG, JPG ou JPEG."
        )

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Document uploaded successfully",
        "filename": file.filename,
        "path": str(file_path)
    }

@app.post("/ocr")
async def ocr_document(file: UploadFile = File(...)):

    allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilisez PDF, PNG, JPG ou JPEG."
        )

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:

        if file_extension == ".pdf":
            text = extract_text_from_pdf(str(file_path))
        else:
            text = extract_text_from_image(str(file_path))

        return {
            "filename": file.filename,
            "text": text
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"OCR error: {str(e)}"
        )

@app.post("/extract")
async def extract_document(file: UploadFile = File(...)):
    allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilisez PDF, PNG, JPG ou JPEG."
        )

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 1. OCR
        if file_extension == ".pdf":
            text = extract_text_from_pdf(str(file_path))
        else:
            text = extract_text_from_image(str(file_path))

        # 2. Extraction avec l'IA
        invoice = extract_invoice_data(text)

        # 3. Convertir InvoiceData en dictionnaire
        invoice_data = invoice.model_dump()

        # 4. Sauvegarder dans MongoDB Atlas
        invoice_id = save_invoice(
            invoice_data,
            file.filename
        )

        # 5. Retourner le résultat
        return {
            "id": invoice_id,
            "filename": file.filename,
            "invoice": invoice_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Extraction error: {str(e)}"
        )


@app.get("/invoices")
async def get_invoices():
    try:
        return get_all_invoices()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@app.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    invoice = get_invoice_by_id(invoice_id)

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )

    return invoice


@app.delete("/invoices/{invoice_id}")
async def delete_invoice_route(invoice_id: str):

    deleted = delete_invoice(invoice_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )

    return {
        "message": "Facture supprimée avec succès",
        "id": invoice_id
    }

@app.put("/invoices/{invoice_id}")
async def update_invoice_route(
    invoice_id: str,
    invoice: InvoiceData
):
    updated = update_invoice(
        invoice_id,
        invoice.model_dump()
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable ou aucune modification"
        )

    return {
        "message": "Facture modifiée avec succès",
        "id": invoice_id
    }

@app.get("/dashboard")
async def get_dashboard():
    invoices = get_all_invoices()

    total_invoices = len(invoices)

    total_ht = sum(
        invoice["invoice"].get("total_ht") or 0
        for invoice in invoices
    )

    total_tax = sum(
        invoice["invoice"].get("tax") or 0
        for invoice in invoices
    )

    total_ttc = sum(
        invoice["invoice"].get("total_ttc") or 0
        for invoice in invoices
    )

    return {
        "total_invoices": total_invoices,
        "total_ht": total_ht,
        "total_tax": total_tax,
        "total_ttc": total_ttc
    }

@app.get("/invoices/export/excel")
async def export_excel():
    invoices = get_all_invoices()

    file = export_invoices_to_excel(invoices)

    return StreamingResponse(
        file,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                'attachment; filename="factures.xlsx"'
        },
    )


@app.get("/invoices/export/pdf")
async def export_pdf():
    invoices = get_all_invoices()

    file = export_invoices_to_pdf(invoices)

    return StreamingResponse(
        file,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                'attachment; filename="factures.pdf"'
        },
    )


# Taille maximale autorisée par image : 8 Mo
MAX_ID_IMAGE_SIZE = 8 * 1024 * 1024


@app.post("/verify-identity")
async def verify_identity(
    id_photo: UploadFile = File(...),
    selfie: UploadFile = File(...),
):
    """
    Compare le visage d'une carte d'identité avec un selfie.
    Les photos ne sont ni sauvegardées sur disque ni stockées dans MongoDB.
    """

    allowed_types = {"image/jpeg", "image/png"}

    for uploaded_file, label in [
        (id_photo, "Photo de la carte d'identité"),
        (selfie, "Selfie"),
    ]:
        if uploaded_file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"{label} : seuls les formats JPEG et PNG sont acceptés.",
            )

    try:
        # Lecture limitée pour éviter de charger un fichier trop volumineux.
        id_bytes = await id_photo.read(MAX_ID_IMAGE_SIZE + 1)
        selfie_bytes = await selfie.read(MAX_ID_IMAGE_SIZE + 1)

        if len(id_bytes) > MAX_ID_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="La photo de la carte dépasse la limite de 8 Mo.",
            )

        if len(selfie_bytes) > MAX_ID_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Le selfie dépasse la limite de 8 Mo.",
            )

        result = compare_identity_face(
            id_image_bytes=id_bytes,
            selfie_image_bytes=selfie_bytes,
        )

        return {
            "success": True,
            "verification_type": "face_comparison",
            **result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except HTTPException:
        raise

    except Exception as exc:
        # Détail conservé dans les logs serveur, sans l'exposer au client.
        print(f"Erreur de vérification faciale : {exc}")
        raise HTTPException(
            status_code=500,
            detail="Une erreur est survenue pendant la comparaison faciale.",
        ) from exc

    finally:
        await id_photo.close()
        await selfie.close()


@ app.post("/verify-id-card")
async def verify_id_card_endpoint(
    id_photo: UploadFile = File(...),
    selfie: UploadFile = File(...),
):
    allowed_types = {"image/jpeg", "image/png"}

    if id_photo.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="La photo de la carte doit être au format JPEG ou PNG.",
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

        result = verify_id_card_and_selfie(
            id_image_bytes=id_bytes,
            selfie_bytes=selfie_bytes,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    finally:
        await id_photo.close()
        await selfie.close()

        
@app.post("/liveness/blink")
async def detect_blink(frames: list[UploadFile] = File(...)):
    if len(frames) < 5:
        raise HTTPException(
            status_code=400,
            detail="Au moins 5 images sont nécessaires."
        )

    frame_bytes = []

    for frame in frames:
        content = await frame.read()

        if content:
            frame_bytes.append(content)

    try:
        result = analyze_blink_sequence(frame_bytes)
        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error

    except Exception as error:
        print(f"Erreur de détection du clignement : {error}")

        raise HTTPException(
            status_code=500,
            detail="Une erreur est survenue pendant l'analyse."
        ) from error
    
    