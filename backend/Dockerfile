# ==============================================================================
# INTELLIGENT DOCUMENT EXTRACTOR - DOCKERFILE POUR DEPLOIEMENT RENDER / CLOUD
# ==============================================================================
FROM python:3.11-slim

# Configuration de l'environnement Debian non-interactif et logs directs
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# 1. Installation des dépendances système indispensables :
# - tesseract-ocr, tesseract-ocr-fra, tesseract-ocr-eng : Moteur OCR et dictionnaires
# - poppler-utils : pdftoppm pour la pixellisation haute résolution PDF (pdf2image)
# - libgl1, libglib2.0-0, libgomp1 : Bibliothèques graphiques pour OpenCV et MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Copie de l'ensemble du code applicatif backend
COPY . .

# 4. Création des répertoires de travail
RUN mkdir -p uploads private_identity_documents

# 5. Exposition du port dynamique géré par Render
ENV PORT=10000
EXPOSE 10000

# 6. Démarrage du serveur Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]

