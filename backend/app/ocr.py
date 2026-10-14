import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import cv2
import numpy as np



# Tesseract
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Poppler
POPPLER_PATH = r"C:\Users\ISSER TECH\Downloads\poppler-26.09.0\Library\bin"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


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

    pages = convert_from_path(
        pdf_path,
        dpi=300,
        poppler_path=POPPLER_PATH
    )

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
