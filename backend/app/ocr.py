import os
import platform
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import cv2
import numpy as np

import shutil

# Configuration Tesseract (compatible Windows local et Linux/Render)
WINDOWS_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
TESSERACT_ENV = os.getenv("TESSERACT_CMD")

if TESSERACT_ENV and (os.path.exists(TESSERACT_ENV) or shutil.which(TESSERACT_ENV)):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_ENV
elif platform.system() == "Windows" and os.path.exists(WINDOWS_TESSERACT):
    pytesseract.pytesseract.tesseract_cmd = WINDOWS_TESSERACT
elif shutil.which("tesseract"):
    pytesseract.pytesseract.tesseract_cmd = shutil.which("tesseract")
# Sur Linux (ex: Render / conteneur Docker), pytesseract utilisera le binaire tesseract présent dans le PATH

# Configuration Poppler (compatible Windows local et Linux/Render)
WINDOWS_POPPLER = r"C:\Users\ISSER TECH\Downloads\poppler-26.09.0\Library\bin"
POPPLER_ENV = os.getenv("POPPLER_PATH")

if POPPLER_ENV:
    POPPLER_PATH = POPPLER_ENV
elif platform.system() == "Windows" and os.path.isdir(WINDOWS_POPPLER):
    POPPLER_PATH = WINDOWS_POPPLER
else:
    # Sur Linux/Render, pdftoppm est disponible globalement dans /usr/bin
    POPPLER_PATH = None


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from an image using Tesseract OCR.
    """

    image = Image.open(image_path)

    text = pytesseract.image_to_string(
        image,
        lang="fra+eng"
    )

    return text


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Convert PDF pages to images and extract text using Tesseract.
    """

    kwargs = {"dpi": 300}
    if POPPLER_PATH:
        kwargs["poppler_path"] = POPPLER_PATH

    pages = convert_from_path(pdf_path, **kwargs)

    all_text = []

    for page_number, page in enumerate(pages, start=1):

        text = pytesseract.image_to_string(
            page,
            lang="fra+eng"
        )

        all_text.append(
            f"--- Page {page_number} ---\n{text}"
        )

    return "\n\n".join(all_text)


def extract_text_from_id_card(image_path: str) -> str:
    """Prétraite une image de carte avant l'OCR."""

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Impossible de lire l'image de la carte.")

    # Agrandir l'image pour améliorer la reconnaissance.
    height, width = image.shape[:2]
    image = cv2.resize(
        image,
        (width * 2, height * 2),
        interpolation=cv2.INTER_CUBIC,
    )

    # Conversion en niveaux de gris.
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Réduction du bruit et amélioration du contraste.
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    processed = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    ).apply(gray)

    # OCR français et anglais.
    text = pytesseract.image_to_string(
        processed,
        lang="fra+eng",
        config="--psm 6",
    )

    return text.strip()
