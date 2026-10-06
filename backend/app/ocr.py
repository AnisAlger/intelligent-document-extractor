import pytesseract
from PIL import Image
from pdf2image import convert_from_path


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