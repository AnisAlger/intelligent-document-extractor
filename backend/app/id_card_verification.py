
import re
from pathlib import Path
from tempfile import NamedTemporaryFile

from app.ocr import extract_text_from_id_card
from app.face_verification import compare_identity_face


def verify_id_card_and_selfie(
    id_image_bytes: bytes,
    selfie_bytes: bytes,
) -> dict:
    """
    Vérification expérimentale :
    - extrait le texte OCR de la carte ;
    - compare le visage de la carte au selfie.

    Cette fonction ne certifie ni l'authenticité du document,
    ni que le selfie provient d'une personne vivante.
    """
    if not id_image_bytes or not selfie_bytes:
        raise ValueError("La carte et le selfie sont obligatoires.")

    temp_path = None

    try:
        with NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_file.write(id_image_bytes)
            temp_path = Path(temp_file.name)

        ocr_text = extract_text_from_id_card(str(temp_path))

        if not ocr_text.strip():
            raise ValueError(
                "Aucun texte lisible détecté sur la carte."
            )

        face_result = compare_identity_face(
            id_image_bytes,
            selfie_bytes,
        )

        return {
            "ocr": {
                "text_detected": True,
                "text": ocr_text,
            },
            "face_comparison": face_result,
            "identity_verified": False,
            "message": (
                "Analyse effectuée. Une validation complémentaire "
                "du document et de la présence réelle est nécessaire."
            ),
        }

    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
