# ⚡ Intelligent Document Extractor

> **Plateforme Full-Stack d'automatisation comptable par OCR & IA, sécurisée par authentification biométrique faciale anti-usurpation (*Liveness Detection*) et vérification d'identité KYC avec audit administrateur.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20NoSQL-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![OpenCV](https://img.shields.io/badge/OpenCV-Headless%204.9-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Face%20Landmarks-0078D4?style=flat-square&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Tesseract OCR](https://img.shields.io/badge/Tesseract-OCR%205.x-555555?style=flat-square)](https://github.com/tesseract-ocr/tesseract)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-GPT--4o--mini-black?style=flat-square)](https://openrouter.ai)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Audio%20TTS-FF5722?style=flat-square)](https://elevenlabs.io)
[![Security](https://img.shields.io/badge/Crypto-Argon2id%20%26%20JWT-blue?style=flat-square)](https://github.com/pypa/warehouse)

---

## 📑 Sommaire

1. [Aperçu du Projet](#-aperçu-du-projet)
2. [Fonctionnalités Majeures](#-fonctionnalités-majeures)
3. [Architecture & Flux de Données](#-architecture--flux-de-données)
4. [Arborescence du Projet](#-arborescence-du-projet)
5. [Stack Technologique Complète](#-stack-technologique-complète)
6. [Référentiel des Endpoints API](#-référentiel-des-endpoints-api)
7. [Installation & Démarrage Rapide](#-installation--démarrage-rapide)
8. [Variables d'Environnement](#-variables-denvironnement)
9. [Sécurité & Protection des Données Personnelles](#-sécurité--protection-des-données-personnelles)
10. [Tests & Validation](#-tests--validation)
11. [Dossier Technique Officiel (PDF)](#-dossier-technique-officiel-pdf)

---

## 🎯 Aperçu du Projet

**Intelligent Document Extractor** est une solution logicielle conçue pour répondre aux trois défis majeurs des systèmes d'information modernes :

1. **Automatisation de l'ingestion comptable** : Traitement OCR de factures (PDF natifs, scans, images photographiées) et conversion déterministe en données structurées JSON normalisées via LLM.
2. **Authentification biométrique anti-fraude** : Connexion par reconnaissance faciale couplée à un contrôle dynamique du vivant (*Liveness Detection*) vérifiant les micro-clignements des yeux et les mouvements de tête pour neutraliser les attaques par photo ou écran.
3. **Vérification d'identité KYC (*Know Your Customer*)** : Analyse comparative entre carte nationale d'identité (CNI) et selfie en direct, adossée à une interface d'audit dédiée aux administrateurs pour la validation humaine légale.

---

## ✨ Fonctionnalités Majeures

### 🧾 1. Traitement Documentaire & Extraction par IA
- **Pipeline OCR Bilingue (FR/EN)** : Intégration de **Tesseract OCR** couplé à **Poppler** (`pdftoppm` à 300 DPI) pour une pixellisation optimale des PDF haute résolution.
- **Prétraitement d'Images OpenCV** : Binarisation, débruitage bilatéral et rehaussement adaptatif de contraste (**CLAHE**) pour les documents peu lisibles ou présentant des reflets.
- **Extraction Structurée Déterministe** : Appel à des LLMs avancés via **OpenRouter** avec mode `response_format={'type': 'json_object'}` pour garantir l'extraction des données clés (numéro de facture, dates d'émission/échéance, fournisseur, client, total HT, TVA, total TTC, devise).
- **Normalisation Financière Automatique** : Gestion unifiée des séparateurs de milliers, décimales et devises internationales et locales (`EUR`, `USD`, `DA` normalisé en `DZD`).

### 👁️ 2. Biométrie Faciale & Anti-Usurpation (*Liveness Detection*)
- **Détection & Alignement Facial Ultra-Légers** : Modèle **YuNet ONNX** via `cv2.FaceDetectorYN` pour repérer immédiatement le visage et ses 5 points cardinaux.
- **Extraction de Traits (Embeddings 128D)** : Modèle **SFace ONNX** (`cv2.FaceRecognizerSF`) générant une signature faciale mathématique invariante aux variations de lumière, comparée par similarité cosinus.
- **Détection de Clignement par Eye Aspect Ratio (EAR)** : Suivi en direct des 478 repères 3D via **MediaPipe Face Landmarker** pour vérifier la séquence temporelle naturelle *Ouvert ➔ Fermé ➔ Ouvert*.
- **Contrôle Dynamique des Mouvements de Tête** : Analyse du vecteur de rotation relative du nez par rapport aux repères oculaires pour contrer les masques passifs ou photos statiques.
- **Sélection Intelligente de la Meilleure Trame** : Évaluation de la netteté par variance du Laplacien et surface faciale relative avant comparaison.

### 🪪 3. Procédure KYC & Interface d'Audit Administrateur
- **Soumission Multi-Fichiers Sécurisée** : Téléversement simultané de la pièce d'identité et d'un selfie en direct via webcam HTML5.
- **Aide à la Décision Automatisée** : Prise en charge du pré-score biométrique et extraction OCR de la carte, plaçant le dossier en statut `review_required`.
- **Espace Administrateur Dédié** : Console sécurisée avec filtres de statut (`review_required`, `verified`, `rejected`), inspection visuelle haute définition, saisie de notes d'audit et décision définitive.

### 📊 4. Dashboard Financier & Reporting Comptable
- **Métriques & KPIs Temps Réel** : Synthèse instantanée du volume de factures, montant total hors taxes (HT), taxes collectées et total TTC.
- **Graphiques Interactifs** : Visualisations dynamiques avec **Recharts**.
- **Export Comptable Excel (.xlsx)** : Génération automatisée via **OpenPyXL** avec en-têtes stylisés, colonnes à largeur adaptative et filtres automatiques.
- **Export PDF Officiel (.pdf)** : Création de rapports comptables synthétiques en orientation paysage via **ReportLab Platypus** en flux mémoire continu.

### 🤖 5. Chatbot Bilingue (FR/AR) & Synthèse Vocale (TTS)
- **Détection Linguistique Intuitive** : Interaction fluide en langue française ou arabe selon le message utilisateur.
- **Contextualisation selon les Droits** : Réponses adaptées au rôle de l'utilisateur (guidage client ou assistance aux procédures d'audit administrateur).
- **Lecture Vocale Naturelle (TTS)** : Streaming audio MP3 haute fidélité via l'intégration **ElevenLabs**.

---

## 🏗️ Architecture & Flux de Données

```mermaid
flowchart TD
    subgraph Client ["Client Navigateur (React 19 + Vite)"]
        UI["Interface Utilisateur SPA"]
        WebCam["Capture WebCam (HTML5 Canvas)"]
        Audio["Lecteur Audio MP3 (TTS)"]
    end

    subgraph API ["Passerelle Backend (FastAPI Asynchrone)"]
        Auth["/auth (Argon2id + JWT HS256)"]
        Invoices["/invoices & /extract"]
        Liveness["/liveness/blink & /face/verify-live"]
        AdminReviews["/auth/admin (RBAC Guard)"]
        Chat["/chat (LLM + ElevenLabs)"]
    end

    subgraph Vision ["Pipeline IA & Vision"]
        Tess["Tesseract OCR + Poppler 300 DPI"]
        OpenCVPre["OpenCV CLAHE & Bilateral"]
        YuNet["YuNet ONNX (Détection Faciale)"]
        SFace["SFace ONNX (Embeddings 128D)"]
        MediaPipe["MediaPipe 3D Landmarks (EAR & Pose)"]
        OpenRouter["OpenRouter (GPT-4o-mini JSON)"]
    end

    subgraph Storage ["Couche de Persistance & Sécurité"]
        Mongo[("MongoDB Atlas Cloud")]
        PrivateFS[("Coffre-fort Documents Privés (UUIDv4)")]
    end

    UI -->|Facture PDF / Image| Invoices
    Invoices --> Tess
    Tess --> OpenRouter
    OpenRouter -->|InvoiceData JSON| Mongo

    WebCam -->|Rafale d'images| Liveness
    Liveness --> MediaPipe
    Liveness --> YuNet
    YuNet --> SFace
    SFace -->|Vérification Cosinus >= 0.40| Auth

    UI -->|CNI + Selfie KYC| AdminReviews
    AdminReviews --> PrivateFS
    AdminReviews --> Mongo

    UI -->|Requête Bilingue FR/AR| Chat
    Chat --> OpenRouter
    Chat --> Audio
```

---

## 📁 Arborescence du Projet

```text
intelligent-document-extractor/
├── .gitignore
├── DOCUMENTATION_TECHNIQUE_COMPLETE.pdf    # Dossier technique complet (834 lignes de spécs)
├── README.md                              # Documentation générale du projet
│
├── backend/
│   ├── .env                               # Variables d'environnement locales (non commité)
│   ├── .env.example                       # Gabarit de configuration d'environnement
│   ├── .gitignore
│   ├── generate_documentation_pdf.py      # Script ReportLab générant la documentation officielle
│   ├── requirements.txt                   # Dépendances Python (FastAPI, OpenCV, PyTorch/ONNX...)
│   ├── test_admin_documents.py            # Tests d'intégration du workflow d'audit admin
│   ├── test_ai.py                         # Test du connecteur OpenRouter
│   ├── test_auth.py                       # Test du hachage Argon2id et des tokens JWT
│   ├── test_mongodb.py                    # Test de connectivité MongoDB Atlas
│   │
│   ├── private_identity_documents/        # Stockage local protégé des CNI & selfies (accès RBAC)
│   ├── uploads/                           # Stockage temporaire des factures en cours de traitement
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                        # Application FastAPI, CORS, endpoints factures & KYC
│       ├── models.py                      # Modèles Pydantic (InvoiceData, etc.)
│       ├── database.py                    # Connexion PyMongo & opérations CRUD factures/utilisateurs
│       ├── auth.py                        # Fonctions de sécurité : Argon2id & PyJWT
│       ├── auth_routes.py                 # Endpoints /auth (Register, Login, Biométrie, Admin KYC)
│       ├── chat_routes.py                 # Endpoints /chat (Assistant conversationnel & TTS)
│       ├── ocr.py                         # OCR Tesseract, rendu Poppler et pré-traitements d'image
│       ├── ai_extractor.py                # Prompting OpenRouter et structuration JSON stricte
│       ├── face_verification.py           # Inférence YuNet + SFace et comparaison cosinus
│       ├── liveness_detection.py          # Calcul EAR MediaPipe, rotation de tête, netteté Laplacien
│       ├── id_card_verification.py        # Pipeline combiné OCR carte + appariement facial
│       ├── exports.py                     # Générateurs d'exports Excel (OpenPyXL) et PDF (ReportLab)
│       │
│       └── models/
│           └── face/                      # Poids des modèles d'inférence ONNX & Tâches MediaPipe
│               ├── face_detection_yunet_2023mar.onnx
│               ├── face_landmarker.task
│               └── face_recognition_sface_2021dec.onnx
│
└── frontend/
    ├── package.json                       # Dépendances React 19, Vite 8, Recharts
    ├── vite.config.js                     # Configuration du bundler Vite
    ├── index.html                         # Point d'entrée HTML5 avec méta viewport
    ├── public/                            # Actifs statiques publics
    │
    └── src/
        ├── main.jsx                       # Montage de l'application React
        ├── App.jsx                        # Orchestration des onglets et état global d'authentification
        ├── App.css                        # Styles globaux et structure de mise en page
        ├── index.css                      # Variables CSS et charte graphique Glassmorphism
        │
        └── components/
            ├── AuthGateway.jsx            # Portail d'authentification (mot de passe ou biométrie faciale)
            ├── AuthGateway.css
            ├── IdentitySubmission.jsx     # Écran de dépôt des pièces d'identité (CNI + Selfie WebCam)
            ├── IdentityVerification.jsx   # Composant d'assistance visuelle KYC
            ├── IdentityVerification.css
            ├── AdminDocumentReview.jsx    # Console d'audit administrateur des dossiers KYC
            ├── AdminDocumentReview.css
            ├── Dashboard.jsx              # Métriques financières clés et graphiques interactifs Recharts
            ├── InvoiceResult.jsx          # Fiche de visualisation et édition manuelle de facture
            ├── InvoiceHistory.jsx         # Tableau d'historique avec recherche, filtres et exports
            ├── ChatWidget.jsx             # Assistant virtuel flottant bilingue avec lecteur audio TTS
            └── ChatWidget.css
```

---

## 🛠️ Stack Technologique Complète

| Composant | Technologie | Version | Rôle & Justification |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** | `0.110+` | Passerelle ASGI asynchrone native, typage Pydantic v2, documentation OpenAPI/Swagger automatique. |
| **Serveur ASGI** | **Uvicorn / Gunicorn** | `0.28+` / `21.2+` | Moteur asynchrone ultra-rapide basé sur `uvloop` avec gestionnaire multi-workers pour la production. |
| **Base de Données** | **MongoDB Atlas** | PyMongo `4.6+` | Base de données NoSQL distribuée cloud avec connecteur optimisé `[srv]` et `dnspython`. |
| **Cryptographie** | **Argon2id (pwdlib)** | `0.2+` | Standard cryptographique maximal de dérivation de clés, résistant aux attaques par brute-force GPU. |
| **Sessions & Sécurité** | **PyJWT** | `2.8+` | Émission et vérification sans état de jetons signés HMAC-SHA256 (durée de validité de 8 heures). |
| **OCR & Conversion** | **Tesseract OCR & Poppler** | `5.x` / `pdf2image` | Moteur open source bilingue local avec pixellisation haute fidélité à 300 DPI pour les PDF. |
| **Vision par Ordinateur** | **OpenCV Headless** | `4.9+` | Prétraitement d'image (CLAHE) et moteur d'inférence sans dépendance graphique X11 pour conteneurs Linux. |
| **Biométrie Faciale** | **YuNet & SFace ONNX** | ONNX Runtime | Détection temps réel et extraction d'empreintes faciales 128D comparées par similarité angulaire. |
| **Anti-Usurpation** | **MediaPipe Face Mesh** | `0.10.10+` | Analyse 3D de 478 repères pour l'Eye Aspect Ratio (EAR) et la validation des rotations de tête. |
| **Extraction par IA** | **OpenRouter (GPT-4o-mini)** | OpenAI SDK `1.20+` | Structuration JSON déterministe des champs de facture et normalisation des devises. |
| **Synthèse Vocale** | **ElevenLabs TTS** | API OpenRouter | Restitution vocale humaine haute fidélité pour les réponses du chatbot d'assistance. |
| **Exports Fichiers** | **OpenPyXL & ReportLab** | `3.1+` / `4.1+` | Génération dynamique de classeurs Excel `.xlsx` et de rapports PDF paysage `.pdf` en flux mémoire. |
| **Frontend Web** | **React 19 & Vite 8** | `19.2+` / `8.3+` | SPA ultra-réactive avec Fast Refresh instantané et bundle de production optimisé via Rollup. |
| **Visualisation** | **Recharts** | `3.10+` | Graphiques vectoriels interactifs SVG pour le tableau de bord financier. |

---

## 📡 Référentiel des Endpoints API

### 1. Santé & Traitement Documentaire
| Méthode | Endpoint | Auth Requise | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Non | Sonde de disponibilité du serveur API (`{"status": "ok"}`). |
| `POST` | `/upload` | Non | Téléversement direct d'un document (PDF, PNG, JPG, JPEG) dans le dossier de travail. |
| `POST` | `/ocr` | Non | Exécution du moteur OCR brut sur le document et retour du texte extrait. |
| `POST` | `/extract` | Non | Pipeline complet : OCR + Inférence LLM + Sauvegarde automatique dans MongoDB. |

### 2. Gestion des Factures & Exports
| Méthode | Endpoint | Auth Requise | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/invoices` | Non | Liste toutes les factures enregistrées dans MongoDB. |
| `GET` | `/invoices/{invoice_id}` | Non | Récupère le détail d'une facture spécifique. |
| `PUT` | `/invoices/{invoice_id}` | Non | Met à jour les champs financiers et métadonnées d'une facture. |
| `DELETE` | `/invoices/{invoice_id}` | Non | Supprime définitivement une facture de la base de données. |
| `GET` | `/dashboard` | Non | Calcule les indicateurs financiers globaux (Nombre, Total HT, Taxe, TTC). |
| `GET` | `/invoices/export/excel` | Non | Télécharge le classeur Excel stylisé `factures.xlsx` généré en direct. |
| `GET` | `/invoices/export/pdf` | Non | Télécharge le récapitulatif comptable officiel `factures.pdf` en orientation paysage. |

### 3. Authentification & Biométrie Faciale
| Méthode | Endpoint | Auth Requise | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Non | Inscription d'un nouvel utilisateur (mot de passe haché par Argon2id). |
| `POST` | `/auth/login` | Non | Connexion standard par email et mot de passe, retour d'un jeton JWT Bearer. |
| `GET` | `/auth/me` | Bearer JWT | Profil de l'utilisateur connecté, statut administrateur et état biométrique. |
| `POST` | `/auth/face/enroll` | Bearer JWT | Enregistrement de l'empreinte faciale de référence (après validation KYC). |
| `POST` | `/auth/face/verify` | Non | Connexion biométrique rapide par comparaison cosinus de selfie statique. |
| `POST` | `/auth/face/verify-live`| Non | Connexion biométrique renforcée avec contrôles anti-usurpation (clignement + mouvement). |
| `POST` | `/liveness/blink` | Non | Analyse technique d'une séquence vidéo (clignement des yeux via EAR). |

### 4. Vérification d'Identité KYC & Audit Administrateur
| Méthode | Endpoint | Auth Requise | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/verify-id-card` | Bearer JWT | Dépôt du dossier d'identité (CNI + Selfie), analyse OCR et placement en attente d'audit. |
| `POST` | `/verify-identity` | Non | Comparaison faciale directe en mémoire vive sans persistance des images. |
| `GET` | `/auth/admin/identity-reviews` | Admin JWT | Liste des dossiers d'identité avec filtre (`review_required`, `verified`, `rejected`, `all`). |
| `GET` | `/auth/admin/users/{user_id}/identity-review` | Admin JWT | Détail complet d'un dossier KYC d'un utilisateur pour audit approfondi. |
| `PATCH`| `/auth/admin/users/{user_id}/identity-review` | Admin JWT | Décision d'audit finale (`verified` ou `rejected`) avec note justificative. |
| `GET` | `/auth/admin/users/{user_id}/documents/{type}`| Admin JWT | Flux sécurisé de la CNI (`id_card`) ou du selfie (`selfie`) avec en-têtes anti-cache. |

### 5. Assistant Virtuel & Synthèse Vocale
| Méthode | Endpoint | Auth Requise | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/chat/message` | Optionnel | Échange conversationnel avec le chatbot bilingue FR/AR (adapté au profil admin ou client). |
| `POST` | `/chat/tts` | Optionnel | Synthèse vocale de la réponse générée sous forme de flux audio MP3 en streaming. |

---

## 🚀 Installation & Démarrage Rapide

### Prérequis Système
- **Python** `3.10` ou version supérieure.
- **Node.js** `18.x` ou version supérieure et **npm**.
- **Tesseract OCR** installé sur la machine :
  - *Windows* : Télécharger l'installateur UB-Mannheim et vérifier le chemin `C:\Program Files\Tesseract-OCR\tesseract.exe`.
  - *Linux (Ubuntu/Debian)* : `sudo apt-get install -y tesseract-ocr tesseract-ocr-fra`
- **Poppler** (requis pour la pixellisation des PDF) :
  - *Windows* : Décompresser les binaires Poppler dans un dossier accessible.
  - *Linux (Ubuntu/Debian)* : `sudo apt-get install -y poppler-utils`

---

### 1. Configuration & Lancement du Backend

```bash
# 1. Accéder au répertoire backend
cd backend

# 2. Créer et activer l'environnement virtuel Python
python -m venv venv

# Sous Windows PowerShell :
.\venv\Scripts\Activate.ps1
# Sous Linux / macOS :
source venv/bin/activate

# 3. Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configurer les variables d'environnement
cp .env.example .env
# Éditez le fichier .env avec vos clés réelles (MongoDB Atlas, OpenRouter, ElevenLabs, etc.)

# 5. Démarrer le serveur de développement FastAPI
uvicorn app.main:app --reload --port 8000
```

> Le serveur backend démarrera sur : **`http://localhost:8000`**  
> Documentation interactive Swagger accessible sur : **`http://localhost:8000/docs`**

---

### 2. Configuration & Lancement du Frontend

```bash
# 1. Ouvrir un second terminal et naviguer dans le dossier frontend
cd frontend

# 2. Installer les modules Node.js
npm install

# 3. Lancer le serveur de développement Vite
npm run dev
```

> L'interface Web cliente sera immédiatement accessible sur : **`http://localhost:5173`**

---

## 🔐 Variables d'Environnement

Le backend s'appuie sur le fichier `backend/.env` (un gabarit prêt à l'emploi est disponible dans [`.env.example`](file:///c:/Users/ISSER%20TECH/Desktop/Projets/intelligent-document-extractor/backend/.env.example)) :

| Variable | Requis | Description | Exemple / Valeur par défaut |
| :--- | :---: | :--- | :--- |
| `OPENROUTER_API_KEY` | **Oui** | Clé API OpenRouter pour l'extraction de factures et le chatbot IA. | `sk-or-v1-xxxxxxxx...` |
| `MONGODB_URI` | **Oui** | Chaîne de connexion officielle MongoDB Atlas (protocole `mongodb+srv://`). | `mongodb+srv://user:pass@cluster.mongodb.net/?...` |
| `JWT_SECRET_KEY` | **Oui** | Clé secrète de signature cryptographique des jetons de session JWT. | Chaîne aléatoire (min. 32 caractères) |
| `ADMIN_EMAILS` | **Oui** | Liste d'adresses emails habilitées aux privilèges Administrateur (séparées par virgule). | `anis@gmail.com,admin@societe.com` |
| `ELEVENLABS_API_KEY` | Optionnel | Clé API pour la synthèse vocale des réponses du chatbot. | `sk-or-v1-xxxxxxxx...` |
| `ELEVENLABS_VOICE_ID` | Optionnel | Identifiant de la voix sélectionnée pour le rendu audio. | `21m00Tcm4TlvDq8ikWAM` |
| `ALLOWED_ORIGINS` | Optionnel | Origines autorisées par la politique CORS (séparées par virgule). | `http://localhost:5173` |
| `TESSERACT_CMD` | Optionnel | Chemin absolu vers le binaire de Tesseract (spécifique Windows si hors PATH). | `C:\Program Files\Tesseract-OCR\tesseract.exe` |
| `POPPLER_PATH` | Optionnel | Chemin vers le dossier `bin` des exécutables Poppler (spécifique Windows). | `C:\poppler\Library\bin` |

---

## 🛡️ Sécurité & Protection des Données Personnelles

La manipulation de pièces d'identité et de vecteurs biométriques requiert une rigueur absolue conforme aux principes de protection des données (RGPD) :

1. **Isolation Complète des Données Biométriques** :
   - Les photos de pièces d'identité et les selfies KYC sont enregistrés dans le répertoire protégé `private_identity_documents/`, strictement isolé de tout serveur de fichiers statiques public.
   - Les fichiers sont renommés aléatoirement via UUIDv4 sous la nomenclature `{user_id}_{document_id}_id.jpg`.
2. **Neutralisation du Path Traversal** :
   - Chaque requête de consultation admin vérifie la résolution absolue `file_path.is_relative_to(PRIVATE_DIR)`, éliminant tout risque d'attaque par saut de répertoire (`../`).
3. **En-têtes HTTP de Confidentialité Stricte** :
   - Les documents sensibles sont servis avec les en-têtes :
     ```http
     Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0
     Pragma: no-cache
     X-Content-Type-Options: nosniff
     ```
   - Cela interdit tout stockage en cache local, proxy intermédiaire ou navigateur.
4. **Authentification Forte Argon2id** :
   - Remplacement de bcrypt par **Argon2id** (vainqueur du *Password Hashing Competition*), garantissant une protection maximale contre les attaques par dictionnaire assistées par GPU/ASIC.
5. **Principe de Décision Humaine (Human-in-the-Loop)** :
   - Aucune validation d'identité n'est effectuée à l'aveugle : l'algorithme fournit un score d'aide à la décision, mais l'approbation finale relève toujours d'un administrateur assermenté.

---

## 🧪 Tests & Validation

Des scripts de tests automatisés couvrent les aspects critiques du système :

```bash
cd backend

# Tester le module de sécurité et d'audit des documents d'identité (RBAC + Anti-Traversal)
python test_admin_documents.py

# Tester le hachage de mot de passe et l'encodage/décodage des tokens JWT
python test_auth.py

# Tester la communication avec le LLM via OpenRouter
python test_ai.py

# Vérifier la liaison avec le cluster MongoDB Atlas
python test_mongodb.py
```

---

## 📄 Dossier Technique Officiel (PDF)

Le projet intègre un générateur de documentation technique institutionnelle au format PDF, compilé via **ReportLab Platypus** :
- **Fichier généré** : [`DOCUMENTATION_TECHNIQUE_COMPLETE.pdf`](file:///c:/Users/ISSER%20TECH/Desktop/Projets/intelligent-document-extractor/DOCUMENTATION_TECHNIQUE_COMPLETE.pdf) (situé à la racine du projet).
- **Contenu** : 6 pages de spécifications exhaustives, justification de chaque choix technologique, tableaux comparatifs et modélisation des flux.
- **Régénération du PDF** :
  ```bash
  cd backend
  python generate_documentation_pdf.py
  ```

---

## 👥 Auteur & Licence

- **Développeur & Propriétaire** : Anis ([AnisAlger](https://github.com/AnisAlger))
- **Application** : *Intelligent Document Extractor*
- **Licence** : Projet sous licence propriétaire / confidentiel — Tous droits réservés.
