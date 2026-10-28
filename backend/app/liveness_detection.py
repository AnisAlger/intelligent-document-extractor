
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np


MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "face"
    / "face_landmarker.task"
)

# Indices des points des yeux dans le modèle Face Landmarker.
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

CLOSED_THRESHOLD = 0.19
OPEN_THRESHOLD = 0.22


def eye_aspect_ratio(landmarks, indices) -> float:
    """Calcule un indicateur géométrique d'ouverture de l'œil."""

    points = np.array(
        [
            [landmarks[i].x, landmarks[i].y]
            for i in indices
        ],
        dtype=np.float32,
    )

    vertical_1 = np.linalg.norm(points[1] - points[5])
    vertical_2 = np.linalg.norm(points[2] - points[4])
    horizontal = np.linalg.norm(points[0] - points[3])

    if horizontal < 1e-6:
        return 0.0

    return float(
        (vertical_1 + vertical_2) / (2.0 * horizontal)
    )


def analyze_blink_sequence(
    frames: list[bytes],
) -> dict:
    """
    Analyse une séquence d'images JPEG ou PNG.

    Cherche la séquence :
    yeux ouverts -> yeux fermés -> yeux ouverts.

    Ce contrôle est expérimental et ne constitue pas
    une preuve fiable de présence réelle.
    """

    if len(frames) < 5:
        raise ValueError(
            "Fournissez au moins 5 images successives."
        )

    if not MODEL_PATH.is_file():
        raise RuntimeError(
            f"Modèle Face Landmarker introuvable : {MODEL_PATH}"
        )

    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(
            model_asset_path=str(MODEL_PATH)
        ),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
    )

    valid_frames = 0
    ratios = []
    states = []

    with mp.tasks.vision.FaceLandmarker.create_from_options(
        options
    ) as landmarker:

        for frame_bytes in frames:
            array = np.frombuffer(frame_bytes, dtype=np.uint8)
            image = cv2.imdecode(array, cv2.IMREAD_COLOR)

            if image is None:
                continue

            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb,
            )

            result = landmarker.detect(mp_image)

            if not result.face_landmarks:
                states.append("no_face")
                continue

            landmarks = result.face_landmarks[0]

            if len(landmarks) <= max(LEFT_EYE + RIGHT_EYE):
                states.append("invalid_landmarks")
                continue

            left_ratio = eye_aspect_ratio(
                landmarks, LEFT_EYE
            )
            right_ratio = eye_aspect_ratio(
                landmarks, RIGHT_EYE
            )

            ear = (left_ratio + right_ratio) / 2.0

            ratios.append(round(ear, 4))
            valid_frames += 1

            if ear <= CLOSED_THRESHOLD:
                states.append("closed")
            elif ear >= OPEN_THRESHOLD:
                states.append("open")
            else:
                states.append("transition")

    if valid_frames < 5:
        return {
            "success": False,
            "blink_detected": False,
            "valid_frames": valid_frames,
            "message": (
                "Pas assez d'images exploitables. "
                "Placez votre visage devant la caméra."
            ),
        }

    # Rechercher une fermeture encadrée par des yeux ouverts.
    saw_open = False
    saw_closed = False
    blink_detected = False

    for state in states:
        if state == "open":
            if saw_closed:
                blink_detected = True
                break
            saw_open = True

        elif state == "closed" and saw_open:
            saw_closed = True

    return {
        "success": True,
        "blink_detected": blink_detected,
        "frames_received": len(frames),
        "valid_frames": valid_frames,
        "ear_values": ratios,
        "status": (
            "blink_candidate"
            if blink_detected
            else "blink_not_detected"
        ),
        "message": (
            "Un cycle de clignement candidat a été détecté."
            if blink_detected
            else (
                "Aucun cycle complet détecté. "
                "Réessayez avec une séquence plus claire."
            )
        ),
        "liveness_verified": False,
    }

def analyze_head_movement_sequence(frames: list[bytes]) -> dict:
    """Détecte un mouvement horizontal candidat de la tête.
    
    Prototype expérimental : ce contrôle ne garantit pas à lui seul
    qu'il s'agit d'une personne réelle.
    """
    import cv2
    import mediapipe as mp
    import numpy as np
    from pathlib import Path

    if len(frames) < 5:
        raise ValueError("Au moins 5 images sont nécessaires.")

    if not MODEL_PATH.is_file():
        raise RuntimeError(
            f"Modèle Face Landmarker introuvable : {MODEL_PATH}"
        )

    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(
            model_asset_path=str(MODEL_PATH)
        ),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
    )

    positions = []
    valid_frames = 0

    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as landmarker:
        for frame_bytes in frames:
            image_array = np.frombuffer(frame_bytes, dtype=np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if image is None:
                continue

            height, width = image.shape[:2]
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb,
            )
            result = landmarker.detect(mp_image)

            if not result.face_landmarks:
                continue

            landmarks = result.face_landmarks[0]

            # Coins externes des yeux et pointe du nez.
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            nose = landmarks[1]

            eye_distance = np.hypot(
                (right_eye.x - left_eye.x) * width,
                (right_eye.y - left_eye.y) * height,
            )

            if eye_distance < 1:
                continue

            eye_center_x = (left_eye.x + right_eye.x) / 2
            normalized_nose_x = (
                (nose.x - eye_center_x) * width / eye_distance
            )

            positions.append(float(normalized_nose_x))
            valid_frames += 1

    if len(positions) < 5:
        return {
            "success": False,
            "head_movement_detected": False,
            "valid_frames": valid_frames,
            "status": "insufficient_face_frames",
            "liveness_verified": False,
        }

    movement = max(positions) - min(positions)

    # Seuil initial à tester avec plusieurs personnes et caméras.
    detected = movement >= 0.18

    return {
        "success": True,
        "head_movement_detected": detected,
        "valid_frames": valid_frames,
        "normalized_movement": round(float(movement), 4),
        "status": "movement_candidate" if detected else "movement_not_detected",
        "liveness_verified": False,
    }

def select_best_face_frame(frames: list[bytes]) -> dict:
    """Sélectionne l'image de visage de meilleure qualité.

    Cette fonction évalue la qualité de l'image, pas l'identité
    de la personne.
    """
    import cv2
    import mediapipe as mp
    import numpy as np
    from pathlib import Path

    if not frames:
        raise ValueError("Aucune image n'a été fournie.")

    if not MODEL_PATH.is_file():
        raise RuntimeError(
            f"Modèle Face Landmarker introuvable : {MODEL_PATH}"
        )

    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(
            model_asset_path=str(MODEL_PATH)
        ),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
    )

    best_frame = None
    best_score = -1.0
    best_metrics = None
    evaluated_frames = 0

    with mp.tasks.vision.FaceLandmarker.create_from_options(
        options
    ) as landmarker:

        for index, frame_bytes in enumerate(frames):
            image_array = np.frombuffer(
                frame_bytes, dtype=np.uint8
            )
            image = cv2.imdecode(
                image_array, cv2.IMREAD_COLOR
            )

            if image is None:
                continue

            height, width = image.shape[:2]

            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb,
            )

            result = landmarker.detect(mp_image)

            if not result.face_landmarks:
                continue

            landmarks = result.face_landmarks[0]

            x_min = max(
                0, int(min(p.x for p in landmarks) * width)
            )
            x_max = min(
                width, int(max(p.x for p in landmarks) * width)
            )
            y_min = max(
                0, int(min(p.y for p in landmarks) * height)
            )
            y_max = min(
                height, int(max(p.y for p in landmarks) * height)
            )

            if x_max <= x_min or y_max <= y_min:
                continue

            face_crop = image[y_min:y_max, x_min:x_max]

            if face_crop.size == 0:
                continue

            gray_face = cv2.cvtColor(
                face_crop, cv2.COLOR_BGR2GRAY
            )

            # Netteté : une variance élevée indique généralement
            # davantage de détails, sans garantir une bonne image.
            sharpness = float(
                cv2.Laplacian(
                    gray_face, cv2.CV_64F
                ).var()
            )
            sharpness_score = min(sharpness / 150.0, 1.0)

            # Taille du visage dans l'image entière.
            face_area_ratio = (
                (x_max - x_min) * (y_max - y_min)
            ) / (width * height)
            size_score = min(face_area_ratio / 0.20, 1.0)

            # Luminosité moyenne : pénalise les images trop
            # sombres ou trop surexposées.
            brightness = float(np.mean(gray_face))
            exposure_score = max(
                0.0,
                1.0 - abs(brightness - 125.0) / 125.0,
            )

            # Score heuristique de qualité, compris entre 0 et 1.
            quality_score = (
                0.50 * sharpness_score
                + 0.30 * size_score
                + 0.20 * exposure_score
            )

            evaluated_frames += 1

            if quality_score > best_score:
                best_score = quality_score
                best_frame = frame_bytes
                best_metrics = {
                    "frame_index": index,
                    "sharpness": round(sharpness, 2),
                    "face_area_ratio": round(
                        face_area_ratio, 4
                    ),
                    "brightness": round(brightness, 2),
                    "quality_score": round(
                        quality_score, 4
                    ),
                }

    if best_frame is None:
        return {
            "success": False,
            "message": "Aucun visage exploitable détecté.",
            "evaluated_frames": evaluated_frames,
            "selected_frame": None,
            "quality": None,
        }

    return {
        "success": True,
        "message": "Meilleure image sélectionnée.",
        "evaluated_frames": evaluated_frames,
        "selected_frame": best_frame,
        "quality": best_metrics,
    }
