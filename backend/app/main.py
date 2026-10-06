from fastapi import FastAPI, UploadFile, File, HTTPException
from app.ocr import (
    extract_text_from_image,
    extract_text_from_pdf
)
from pathlib import Path
import shutil

app = FastAPI(
    title="Intelligent Document Extractor",
    description="API for intelligent extraction of data from invoices",
    version="1.0.0"
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