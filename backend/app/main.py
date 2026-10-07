from fastapi import FastAPI, UploadFile, File, HTTPException
from app.ocr import (
    extract_text_from_image,
    extract_text_from_pdf
)
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
import shutil

app = FastAPI(
    title="Intelligent Document Extractor",
    description="API for intelligent extraction of data from invoices",
    version="1.0.0"
)

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