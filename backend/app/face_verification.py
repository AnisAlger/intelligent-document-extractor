
from pathlib import Path

import cv2
import numpy as np


# Chemins des modèles IA
MODEL_DIR = Path(__file__).resolve().parent / "models" / "face"

DETECTOR_MODEL = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER_MODEL = MODEL_DIR / "face_recognition_sface_2021dec.onnx"

# Limite de taille de l'image en mémoire de traitement
MAX_IMAGE_DIMENSION = 2000


def _load_models():
    """Charge les modèles de détection et de reconnaissance faciale."""

    if not DETECTOR_MODEL.is_file():
        raise RuntimeError(
            f"Modèle de détection introuvable : {DETECTOR_MODEL}"
        )

    if not RECOGNIZER_MODEL.is_file():
        raise RuntimeError(
            f"Modèle de reconnaissance introuvable : {RECOGNIZER_MODEL}"
        )

    detector = cv2.FaceDetectorYN_create(
        str(DETECTOR_MODEL),
        "",
        (320, 320),
        0.6,   # Seuil de confiance de détection
        0.3,   # Seuil de suppression des doublons
        5000,
    )

    recognizer = cv2.FaceRecognizerSF_create(
        str(RECOGNIZER_MODEL),
        "",
    )

    return detector, recognizer


def _decode_image(image_bytes: bytes) -> np.ndarray:
    """Décode une image envoyée à l'API sans l'enregistrer sur disque."""

    if not image_bytes:
        raise ValueError("L'image envoyée est vide.")

    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError(
            "Image illisible. Utilisez une photo JPG, JPEG ou PNG valide."
        )

    height, width = image.shape[:2]

    if width < 80 or height < 80:
        raise ValueError("La résolution de l'image est trop faible.")

    # Réduit les très grandes images tout en conservant leurs proportions.
    largest_dimension = max(width, height)

    if largest_dimension > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / largest_dimension
        new_width = max(1, int(width * scale))
        new_height = max(1, int(height * scale))

        image = cv2.resize(
            image,
            (new_width, new_height),
            interpolation=cv2.INTER_AREA,
        )

    return image


def _detect_one_face(image: np.ndarray, detector):
    """Détecte un seul visage et refuse les images ambiguës."""

    height, width = image.shape[:2]
    detector.setInputSize((width, height))

    _, faces = detector.detect(image)

    if faces is None or len(faces) == 0:
        raise ValueError(
            "Aucun visage détecté. Vérifiez la qualité de la photo "
            "et assurez-vous que le visage est bien visible."
        )

    if len(faces) > 1:
        raise ValueError(
            "Plusieurs visages détectés. Utilisez une image contenant "
            "un seul visage clairement identifiable."
        )

    return faces[0]


def compare_identity_face(
    id_image_bytes: bytes,
    selfie_image_bytes: bytes,
) -> dict:
    """
    Compare le visage d'une carte d'identité avec un selfie.

    Les images sont traitées en mémoire et ne sont pas enregistrées
    par cette fonction.

    Le score est une similarité cosinus, pas une probabilité d'identité.
    Le résultat doit être interprété avec prudence et revu par un humain.
    """

    detector, recognizer = _load_models()

    id_image = _decode_image(id_image_bytes)
    selfie_image = _decode_image(selfie_image_bytes)

    id_face = _detect_one_face(id_image, detector)
    selfie_face = _detect_one_face(selfie_image, detector)

    # Aligne et recadre les visages avant de calculer leurs caractéristiques.
    id_aligned = recognizer.alignCrop(id_image, id_face)
    selfie_aligned = recognizer.alignCrop(selfie_image, selfie_face)

    id_features = recognizer.feature(id_aligned)
    selfie_features = recognizer.feature(selfie_aligned)

    score = recognizer.match(
        id_features,
        selfie_features,
        cv2.FaceRecognizerSF_FR_COSINE,
    )

    return {
        "comparison_score": round(float(score), 4),
        "score_type": "cosine_similarity",
        "status": "review_required",
        "automatic_decision": False,
        "message": (
            "Comparaison effectuée. Le score est un indicateur technique, "
            "pas une preuve d'identité. Une vérification complémentaire "
            "est nécessaire avant toute décision."
        ),
    }


def extract_face_template(image_bytes: bytes) -> list[float]:
    """Extrait un gabarit facial numérique à partir d'une image."""
    detector, recognizer = _load_models()
    image = _decode_image(image_bytes)
    face = _detect_one_face(image, detector)

    aligned_face = recognizer.alignCrop(image, face)
    features = recognizer.feature(aligned_face)

    # Vérifier que le gabarit contient uniquement des valeurs finies.
    template = features.flatten().astype(np.float32)

    if not np.isfinite(template).all():
        raise ValueError("Impossible de créer un gabarit facial valide.")

    return template.tolist()


def compare_face_to_template(
    selfie_bytes: bytes,
    stored_template: list[float],
) -> dict:
    """Compare un selfie avec un gabarit facial déjà enregistré."""
    detector, recognizer = _load_models()
    image = _decode_image(selfie_bytes)
    face = _detect_one_face(image, detector)

    aligned_face = recognizer.alignCrop(image, face)
    features = recognizer.feature(aligned_face).flatten().astype(np.float32)

    template = np.asarray(stored_template, dtype=np.float32).flatten()

    if (
        template.shape != features.shape
        or not np.isfinite(template).all()
        or not np.isfinite(features).all()
    ):
        raise ValueError("Le gabarit facial enregistré est invalide.")

    score = recognizer.match(
        features.reshape(1, -1),
        template.reshape(1, -1),
        cv2.FaceRecognizerSF_FR_COSINE,
    )

    return {
        "comparison_score": round(float(score), 4),
        "score_type": "cosine_similarity",
        "automatic_decision": False,
        "status": "review_required",
    }
