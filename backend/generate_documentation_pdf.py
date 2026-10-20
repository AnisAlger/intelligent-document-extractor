import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Page de couverture : juste un bas de page sobre
            self.saveState()
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(19.2 * cm, 1.2 * cm, "Documentation Technique Officielle")
            self.restoreState()
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # En-tête
        self.drawString(1.8 * cm, 28.5 * cm, "INTELLIGENT DOCUMENT EXTRACTOR  |  DOCUMENTATION TECHNIQUE")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(1.8 * cm, 28.2 * cm, 19.2 * cm, 28.2 * cm)
        
        # Pied de page
        self.line(1.8 * cm, 1.6 * cm, 19.2 * cm, 1.6 * cm)
        self.drawString(1.8 * cm, 1.1 * cm, "Confidentiel & Usage Interne — Architecture & Justification des Choix Techniques")
        page_str = f"Page {self._pageNumber} / {page_count}"
        self.drawRightString(19.2 * cm, 1.1 * cm, page_str)
        self.restoreState()


def create_documentation_pdf(filename="DOCUMENTATION_TECHNIQUE_COMPLETE.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
    )

    styles = getSampleStyleSheet()

    # Couleurs du thème
    PRIMARY = colors.HexColor("#0f172a")      # Bleu Nuit / Slate 900
    ACCENT = colors.HexColor("#1d4ed8")       # Bleu Royal / Blue 700
    SECONDARY = colors.HexColor("#334155")    # Slate 700
    MUTED = colors.HexColor("#64748b")        # Slate 500
    BG_LIGHT = colors.HexColor("#f8fafc")     # Slate 50
    BORDER_LIGHT = colors.HexColor("#e2e8f0") # Slate 200
    GREEN_OK = colors.HexColor("#059669")     # Emerald 600

    # Styles personnalisés
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        alignment=0,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=ACCENT,
        alignment=0,
    )

    meta_style = ParagraphStyle(
        "CoverMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        textColor=MUTED,
    )

    h1_style = ParagraphStyle(
        "Header1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=21,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Header2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=SECONDARY,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        "BodyDarkBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=14,
        textColor=PRIMARY,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=SECONDARY,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )

    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=PRIMARY,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=SECONDARY,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=PRIMARY,
    )

    story = []

    # =========================================================================
    # PAGE 1 : COUVERTURE & RÉSUMÉ EXÉCUTIF
    # =========================================================================
    story.append(Spacer(1, 2 * cm))
    
    badge_table = Table(
        [[Paragraph("DOSSIER D'ARCHITECTURE & SPÉCIFICATIONS TECHNIQUES", ParagraphStyle("Badge", fontName="Helvetica-Bold", fontSize=8.5, textColor=ACCENT))]],
        colWidths=[17.4 * cm]
    )
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Intelligent Document Extractor", title_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Documentation Technique Complète, Justification de la Stack et Architecture Système", subtitle_style))
    story.append(Spacer(1, 0.5 * cm))

    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=15))

    overview_box = [
        [
            Paragraph("<b>Projet :</b> Intelligent Document Extractor", meta_style),
            Paragraph("<b>Environnement :</b> Full-Stack (Render / Atlas)", meta_style)
        ],
        [
            Paragraph("<b>Auteur / Propriétaire :</b> Équipe Ingénierie", meta_style),
            Paragraph(f"<b>Généré le :</b> {datetime.now().strftime('%d/%m/%Y')}", meta_style)
        ],
        [
            Paragraph("<b>Stack Principale :</b> FastAPI, React 19, MongoDB Atlas", meta_style),
            Paragraph("<b>IA & Vision :</b> Tesseract, OpenCV, MediaPipe, OpenRouter", meta_style)
        ]
    ]
    overview_table = Table(overview_box, colWidths=[8.7 * cm, 8.7 * cm])
    overview_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_LIGHT),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 1.0 * cm))

    story.append(Paragraph("Résumé Exécutif", h2_style))
    story.append(Paragraph(
        "Ce document constitue le dossier de référence officiel de la plateforme <b>Intelligent Document Extractor</b>. "
        "L'application a été conçue pour résoudre trois défis majeurs des systèmes d'information modernes : "
        "(1) l'automatisation intégrale de l'ingestion comptable (extraction structurée de factures multidevises via OCR et LLM), "
        "(2) la sécurisation biométrique des accès utilisateurs avec authentification faciale anti-usurpation (*Liveness Detection*), et "
        "(3) la vérification d'identité KYC (*Know Your Customer*) combinant analyse de carte nationale d'identité et audit d'administration.",
        body_style
    ))
    story.append(Paragraph(
        "Chaque brique logicielle, bibliothèque et composant d'intelligence artificielle a été sélectionné selon des critères rigoureux "
        "d'efficience algorithmique, de robustesse cryptographique, de légèreté mémoire et de conformité aux standards industriels.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2 : ARCHITECTURE GLOBALE & FLUX
    # =========================================================================
    story.append(Paragraph("1. Architecture Globale du Système", h1_style))
    story.append(Paragraph(
        "L'application s'appuie sur une architecture distribuée moderne découplée en trois couches : "
        "une interface client réactive (Frontend SPA), un serveur d'application d'inférence asynchrone (Backend REST), "
        "et une couche de persistance hybride (Base NoSQL + Stockage sécurisé isolé).",
        body_style
    ))

    arch_rows = [
        [
            Paragraph("Couche", table_header_style),
            Paragraph("Technologies Clés", table_header_style),
            Paragraph("Rôle & Responsabilité Système", table_header_style)
        ],
        [
            Paragraph("<b>Frontend (Client)</b>", table_cell_bold),
            Paragraph("React 19, Vite 8, Recharts, CSS Glassmorphism", table_cell_style),
            Paragraph("Interface monopage (SPA) réactive, capture flux WebCam HTML5, dashboard analytique, lecteur TTS.", table_cell_style)
        ],
        [
            Paragraph("<b>Backend (API)</b>", table_cell_bold),
            Paragraph("FastAPI, Uvicorn, Gunicorn, Pydantic v2", table_cell_style),
            Paragraph("Passerelle ASGI asynchrone, validation stricte, endpoints REST, sécurisation des sessions JWT.", table_cell_style)
        ],
        [
            Paragraph("<b>Vision & OCR</b>", table_cell_bold),
            Paragraph("Tesseract OCR, Poppler (pdf2image), OpenCV (CLAHE)", table_cell_style),
            Paragraph("Binarisation, débruitage, rehaussement de contraste, conversion PDF vectoriel vers matriciel, OCR bilingue.", table_cell_style)
        ],
        [
            Paragraph("<b>Biométrie Faciale</b>", table_cell_bold),
            Paragraph("YuNet ONNX, SFace ONNX, Cosine Similarity", table_cell_style),
            Paragraph("Détection faciale ultra-rapide, extraction de gabarit facial (vecteur 128D) et calcul d'appariement.", table_cell_style)
        ],
        [
            Paragraph("<b>Anti-Usurpation</b>", table_cell_bold),
            Paragraph("MediaPipe Face Landmarker (478 repères 3D)", table_cell_style),
            Paragraph("Mesure de l'Eye Aspect Ratio (EAR) pour le clignement des yeux et validation des rotations de tête.", table_cell_style)
        ],
        [
            Paragraph("<b>Intelligence LLM</b>", table_cell_bold),
            Paragraph("OpenRouter (GPT-3.5-Turbo, GPT-4o-mini)", table_cell_style),
            Paragraph("Structuration JSON déterministe des factures et assistant conversationnel bilingue FR/AR.", table_cell_style)
        ],
        [
            Paragraph("<b>Synthèse Vocale</b>", table_cell_bold),
            Paragraph("ElevenLabs TTS via OpenRouter Audio", table_cell_style),
            Paragraph("Restitution vocale naturelle et fluide des réponses du chatbot en streaming binaire MP3.", table_cell_style)
        ],
        [
            Paragraph("<b>Base de Données</b>", table_cell_bold),
            Paragraph("MongoDB Atlas, PyMongo, DnsPython", table_cell_style),
            Paragraph("Base NoSQL cloud flexible pour stocker les factures et les profils utilisateurs avec index uniques.", table_cell_style)
        ],
        [
            Paragraph("<b>Stockage Privé</b>", table_cell_bold),
            Paragraph("Système de fichiers avec protection Path Traversal", table_cell_style),
            Paragraph("Coffre-fort local isolé pour les images CNI et selfies avec en-têtes no-cache stricts.", table_cell_style)
        ],
    ]
    arch_table = Table(arch_rows, colWidths=[3.2 * cm, 5.0 * cm, 9.2 * cm])
    arch_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("2. Backend & Serveur d'Application : Choix & Justifications", h1_style))
    story.append(Paragraph(
        "<b>FastAPI :</b> Sélectionné pour sa compatibilité native avec l'asynchronisme Python (<font face='Courier'>async/await</font>), "
        "essentiel lors de la manipulation de fichiers volumineux et d'appels réseau distants (LLM, MongoDB Atlas). "
        "Ses performances figurent parmi les plus élevées de l'écosystème Python grâce à Starlette et Pydantic.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Uvicorn & Gunicorn :</b> Uvicorn assure le rôle de serveur ASGI ultra-léger basé sur <font face='Courier'>uvloop</font>. "
        "En production (déploiement Render Linux), Gunicorn agit comme superviseur de processus maître (process manager), garantissant "
        "la haute disponibilité, le redémarrage automatique en cas de défaillance et l'équilibrage de charge entre workers.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Python-Multipart :</b> Obligatoire sous FastAPI pour parser les requêtes <font face='Courier'>multipart/form-data</font>, "
        "permettant de recevoir simultanément des métadonnées (formulaires) et des flux binaires de fichiers (PDF, JPEG, PNG, séquences d'images).",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Pydantic v2 & Email-Validator :</b> Garantit l'intégrité absolue des flux entrants et sortants. "
        "La validation Pydantic élimine les failles d'injection de types et normalise la sérialisation JSON. "
        "<font face='Courier'>email-validator</font> applique les règles RFC pour interdire toute adresse email frauduleuse ou malformée.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>PyMongo & DnsPython :</b> Pilote officiel MongoDB. Le flag <font face='Courier'>[srv]</font> et <font face='Courier'>dnspython</font> "
        "permettent la résolution transparente des clusters répliqués MongoDB Atlas via les URIs modernes <font face='Courier'>mongodb+srv://</font>.",
        bullet_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3 : OCR, VISION & INTELLIGENCE ARTIFICIELLE
    # =========================================================================
    story.append(Paragraph("3. Pipeline OCR & Vision par Ordinateur", h1_style))
    story.append(Paragraph(
        "Le traitement documentaire suit une chaîne de traitement séquentielle optimisée pour transformer des documents hétérogènes "
        "(factures scannées, photos de téléphone, PDF natifs) en informations numériques exploitables.",
        body_style
    ))

    story.append(Paragraph("Traitement Documentaire & OCR", h2_style))
    story.append(Paragraph(
        "• <b>Tesseract OCR (pytesseract) :</b> Moteur de reconnaissance optique de caractères développé par HP et perfectionné par Google. "
        "Il fonctionne en local sur le serveur, garantissant la gratuité et la conformité avec la confidentialité des données financières. "
        "Il est configuré en mode bilingue (<font face='Courier'>lang='fra+eng'</font>) pour capturer les vocabulaires comptables français et internationaux.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Poppler & pdf2image :</b> Tesseract ne sachant pas interpréter la structure vectorielle des fichiers PDF, "
        "<font face='Courier'>pdf2image</font> s'interface avec le binaire Poppler (<font face='Courier'>pdftoppm</font>) pour pixelliser "
        "chaque page à 300 DPI (résolution optimale recommandée pour la détection fine des petits caractères de facture).",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>OpenCV Headless (CLAHE & Filtre Bilatéral) :</b> Avant d'appliquer l'OCR sur des cartes d'identité, l'image subit un prétraitement : "
        "agrandissement cubique (x2), conversion en niveaux de gris, lissage par filtre bilatéral (réduction du bruit sans flouter les arêtes) "
        "et égalisation adaptative d'histogramme (CLAHE) pour surmonter les reflets et les zones sombres.",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Extraction Intelligente par LLM (OpenRouter)", h2_style))
    story.append(Paragraph(
        "L'OCR brut contient fréquemment des imperfections (tableaux éclatés, sauts de lignes anarchiques, coquilles de caractères). "
        "Plutôt que d'utiliser des expressions régulières fragiles, le projet intègre un modèle de langage (LLM) via <b>OpenRouter</b> :",
        body_style
    ))
    story.append(Paragraph(
        "1. <b>Format Déterministe :</b> Activation de <font face='Courier'>response_format={'type': 'json_object'}</font> forçant l'IA à produire un JSON valide.",
        bullet_style
    ))
    story.append(Paragraph(
        "2. <b>Normalisation Métier :</b> Prise en compte explicite des spécificités françaises et algériennes : suppression des espaces séparateurs de milliers, "
        "remplacement de la virgule décimale par le point, conversion normalisée de la devise ('DA' devient 'DZD').",
        bullet_style
    ))
    story.append(Paragraph(
        "3. <b>Validation Pydantic :</b> Le résultat JSON retourné est instancié dans le modèle <font face='Courier'>InvoiceData</font>, garantissant "
        "l'absence de champs inattendus et la conformité des types numériques (float).",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("4. Biométrie Faciale & Détection du Vivant (Liveness)", h1_style))
    story.append(Paragraph(
        "Pour concilier sécurité et fluidité d'expérience, l'application intègre un module biométrique avancé exécuté intégralement "
        "en mémoire vive (aucune image sensible n'est persistée lors des vérifications de connexion).",
        body_style
    ))

    bio_rows = [
        [
            Paragraph("Composant", table_header_style),
            Paragraph("Modèle / Algorithme", table_header_style),
            Paragraph("Principe & Rôle dans l'Application", table_header_style)
        ],
        [
            Paragraph("<b>Détecteur de Visage</b>", table_cell_bold),
            Paragraph("YuNet ONNX<br/>(OpenCV FaceDetectorYN)", table_cell_style),
            Paragraph("Localise les boîtes englobantes et 5 repères faciaux clés. Rejette les photos sans visage ou à visages multiples.", table_cell_style)
        ],
        [
            Paragraph("<b>Extracteur de Traits</b>", table_cell_bold),
            Paragraph("SFace ONNX<br/>(OpenCV FaceRecognizerSF)", table_cell_style),
            Paragraph("Aligne le visage et produit un gabarit numérique (vecteur d'embedding 128D) invariant à l'éclairage.", table_cell_style)
        ],
        [
            Paragraph("<b>Score d'Appariement</b>", table_cell_bold),
            Paragraph("Similarité Cosinus<br/>(Seuil opérationnel 0.40)", table_cell_style),
            Paragraph("Calcule la proximité angulaire entre l'empreinte faciale enregistrée et le selfie présenté.", table_cell_style)
        ],
        [
            Paragraph("<b>Clignement des Yeux</b>", table_cell_bold),
            Paragraph("MediaPipe Face Landmarker<br/>(Eye Aspect Ratio - EAR)", table_cell_style),
            Paragraph("Mesure la fermeture dynamique des yeux (transition Ouvert -> Fermé -> Ouvert) pour stopper les attaques par photo.", table_cell_style)
        ],
        [
            Paragraph("<b>Mouvement de Tête</b>", table_cell_bold),
            Paragraph("MediaPipe 3D Landmarks<br/>(Position relative du nez)", table_cell_style),
            Paragraph("Vérifie une rotation horizontale du visage par rapport à l'axe des yeux.", table_cell_style)
        ],
        [
            Paragraph("<b>Sélection de Trame</b>", table_cell_bold),
            Paragraph("Variance du Laplacien & Surface", table_cell_style),
            Paragraph("Sélectionne automatiquement l'image la plus nette et la mieux cadrée parmi la rafale vidéo.", table_cell_style)
        ],
    ]
    bio_table = Table(bio_rows, colWidths=[3.5 * cm, 4.5 * cm, 9.4 * cm])
    bio_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(bio_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4 : SÉCURITÉ, KYC & WORKFLOW ADMIN
    # =========================================================================
    story.append(Paragraph("5. Sécurité, Chiffrement & Workflow KYC", h1_style))
    story.append(Paragraph(
        "La manipulation de pièces d'identité et d'empreintes biométriques exige le respect strict des réglementations sur les données personnelles (RGPD).",
        body_style
    ))

    story.append(Paragraph("Gestion des Mots de Passe & Sessions", h2_style))
    story.append(Paragraph(
        "• <b>Argon2id (pwdlib) :</b> Le hachage des mots de passe emploie Argon2id, standard cryptographique supérieur à bcrypt. "
        "Les mots de passe ne transitent et ne sont stockés qu'après dérivation à mémoire dure, empêchant le cassage par dictionnaires massifs ou cartes graphiques.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Tokens JWT Signés (PyJWT) :</b> Les sessions sont gérées sans état avec une expiration configurée à 8 heures. "
        "Chaque token intègre l'identifiant utilisateur (<font face='Courier'>sub</font>), l'adresse email et l'horodatage d'émission (<font face='Courier'>iat</font>).",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Stockage Sécurisé & Protection des Données KYC", h2_style))
    story.append(Paragraph(
        "• <b>Répertoire Isolé :</b> Les photos de cartes d'identité et les selfies KYC sont enregistrés dans <font face='Courier'>private_identity_documents/</font>, "
        "un répertoire situé hors de portée du serveur web statique public.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Noms de Fichiers Obfusqués :</b> Les fichiers sont renommés de manière unique et aléatoire via UUIDv4 (<font face='Courier'>{user_id}_{document_id}_id.jpg</font>), "
        "rendant toute devinette ou énumération d'URL impossible.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Protection Anti-Path Traversal :</b> Avant toute lecture, le serveur résout le chemin absolu et vérifie <font face='Courier'>file_path.is_relative_to(PRIVATE_DIR)</font>, "
        "neutralisant toute tentative d'injection de caractères spéciaux (<font face='Courier'>../</font>).",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>En-têtes HTTP de Confidentialité :</b> Lors de la consultation par un administrateur, les documents sont servis avec les directives "
        "<font face='Courier'>Cache-Control: private, no-store, no-cache, max-age=0</font> et <font face='Courier'>X-Content-Type-Options: nosniff</font>, "
        "interdisant le stockage temporaire sur les serveurs mandataires ou le navigateur.",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Workflow d'Administration & Revue Manuelle", h2_style))
    story.append(Paragraph(
        "Le système n'adopte pas une validation d'identité 100% aveugle. Il utilise le concept d'<b>aide à la décision</b> : "
        "le moteur calcule un score de similarité faciale et extrait les informations textuelles de la carte, mais place systématiquement le dossier "
        "au statut <font face='Courier'>review_required</font>. "
        "Un administrateur habilité (contrôlé par <font face='Courier'>require_admin</font> et la variable d'environnement <font face='Courier'>ADMIN_EMAILS</font>) "
        "examine visuellement les pièces, annote le dossier et émet la décision finale (<font face='Courier'>verified</font> ou <font face='Courier'>rejected</font>).",
        body_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("6. Exports Comptables & Reporting Automatisé", h1_style))
    story.append(Paragraph(
        "Pour s'intégrer aux processus d'entreprise, l'application propose deux canaux d'exportation programmatique :",
        body_style
    ))
    story.append(Paragraph(
        "• <b>OpenPyXL (Export Excel .xlsx) :</b> Génère un classeur structuré avec en-têtes bleus stylisés, police blanche grasse, "
        "largeur de colonnes calculée dynamiquement selon la longueur du contenu, filtres automatiques activés et gel de la ligne supérieure de titre.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>ReportLab Platypus (Export PDF Comptable) :</b> Compile un document récapitulatif officiel en orientation paysage (<font face='Courier'>landscape(A4)</font>). "
        "La pagination, le positionnement des totaux et la mise en page sont générés en flux mémoire (<font face='Courier'>BytesIO</font>) et streamés au client.",
        bullet_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5 : FRONTEND REACT 19, VITE & CHATBOT VOCAL
    # =========================================================================
    story.append(Paragraph("7. Frontend : Interface Utilisateur & Composants", h1_style))
    story.append(Paragraph(
        "Le client web est conçu sous la forme d'une application monopage (SPA) alliant légèreté, esthétique moderne et réactivité temps réel.",
        body_style
    ))

    story.append(Paragraph("Technologies Fondatrices", h2_style))
    story.append(Paragraph(
        "• <b>React 19 :</b> Utilisation des dernières avancées de React pour la gestion déclarative de l'état (hooks <font face='Courier'>useState</font>, "
        "<font face='Courier'>useEffect</font>, <font face='Courier'>useRef</font>). Permet un rendu fluide des différentes vues sans rechargement de page.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Vite 8 :</b> Remplace Create-React-App et Webpack. Offre un démarrage du serveur de développement à froid en quelques millisecondes "
        "grâce aux modules ES natifs, ainsi qu'un bundling de production hautement optimisé via Rollup.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Recharts :</b> Bibliothèque de graphiques SVG composables pour React. Intégrée dans le composant Dashboard pour afficher la répartition "
        "des montants (HT, TVA, TTC) et les volumes de factures traitées par période.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Design Glassmorphism & Vanilla CSS :</b> L'esthétique visuelle repose sur un thème sombre haut de gamme, utilisant des effets de flou "
        "(<font face='Courier'>backdrop-filter: blur</font>), des bordures subtiles et des transitions CSS soignées sans dépendance lourde tierce.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>API WebCam Native (HTML5 Canvas) :</b> Pilotage direct de la caméra via <font face='Courier'>navigator.mediaDevices.getUserMedia</font>, "
        "permettant la capture instantanée de clichés et de séquences de clignotement sans recourir à des bibliothèques externes encombrantes.",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Structure Modulaire des Composants Frontend", h2_style))

    comp_rows = [
        [
            Paragraph("Composant React", table_header_style),
            Paragraph("Fichier Source", table_header_style),
            Paragraph("Rôle & Fonctionnalités Clés", table_header_style)
        ],
        [
            Paragraph("<b>App.jsx</b>", table_cell_bold),
            Paragraph("src/App.jsx", table_cell_style),
            Paragraph("Routeur interne, restauration de session JWT, gestion des onglets et état global de l'application.", table_cell_style)
        ],
        [
            Paragraph("<b>AuthGateway</b>", table_cell_bold),
            Paragraph("src/components/AuthGateway.jsx", table_cell_style),
            Paragraph("Portail de connexion/inscription combinant saisie identifiants et authentification faciale avec caméra.", table_cell_style)
        ],
        [
            Paragraph("<b>IdentitySubmission</b>", table_cell_bold),
            Paragraph("src/components/IdentitySubmission.jsx", table_cell_style),
            Paragraph("Téléversement de la CNI et enregistrement guidé du selfie en direct pour constitution du dossier KYC.", table_cell_style)
        ],
        [
            Paragraph("<b>AdminDocumentReview</b>", table_cell_bold),
            Paragraph("src/components/AdminDocumentReview.jsx", table_cell_style),
            Paragraph("Interface d'audit administrateur : inspection visuelle CNI vs Selfie, filtres par statut, validation/rejet.", table_cell_style)
        ],
        [
            Paragraph("<b>Dashboard</b>", table_cell_bold),
            Paragraph("src/components/Dashboard.jsx", table_cell_style),
            Paragraph("Affichage des KPIs financiers globaux et graphiques analytiques interactifs Recharts.", table_cell_style)
        ],
        [
            Paragraph("<b>InvoiceResult</b>", table_cell_bold),
            Paragraph("src/components/InvoiceResult.jsx", table_cell_style),
            Paragraph("Visualisation détaillée des champs extraits de la facture avec possibilité de correction immédiate.", table_cell_style)
        ],
        [
            Paragraph("<b>InvoiceHistory</b>", table_cell_bold),
            Paragraph("src/components/InvoiceHistory.jsx", table_cell_style),
            Paragraph("Tableau récapitulatif avec recherche textuelle, pagination, suppression et téléchargements Excel/PDF.", table_cell_style)
        ],
        [
            Paragraph("<b>ChatWidget</b>", table_cell_bold),
            Paragraph("src/components/ChatWidget.jsx", table_cell_style),
            Paragraph("Bulle d'assistance flottante interactive avec historique de discussion et lecteur audio TTS intégré.", table_cell_style)
        ],
    ]
    comp_table = Table(comp_rows, colWidths=[3.5 * cm, 4.5 * cm, 9.4 * cm])
    comp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(comp_table)

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("8. Assistant Conversationnel Bilingue & Synthèse Vocale", h1_style))
    story.append(Paragraph(
        "Un assistant virtuel intelligent a été intégré dans l'application pour guider les utilisateurs et administrateurs :",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Bilinguisme Automatique (FR / AR) :</b> Le prompt système détecte la langue du message utilisateur et formule sa réponse "
        "en français ou en arabe selon le cas, tout en respectant une tonalité professionnelle et bienveillante.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Conscience du Rôle Utilisateur :</b> Si l'utilisateur est authentifié en tant qu'administrateur, le contexte système s'enrichit "
        "d'instructions spécifiques pour le guider sur la validation des dossiers d'identité et les statistiques financières.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Synthèse Vocale ElevenLabs (TTS) :</b> L'endpoint <font face='Courier'>/chat/tts</font> convertit les réponses textuelles "
        "en voix humaine naturelle diffusée sous forme de flux audio MP3 continu, offrant une accessibilité complète.",
        bullet_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6 : DÉPLOIEMENT, MULTIPLATEFORME & TABLEAU RÉCAPITULATIF FINAL
    # =========================================================================
    story.append(Paragraph("9. Déploiement & Compatibilité Multiplateforme", h1_style))
    story.append(Paragraph(
        "Le code du projet a été spécifiquement conçu pour fonctionner de manière transparente en environnement local de développement (Windows) "
        "et sur conteneur de production Cloud (Linux / Render) :",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Détection Dynamique de Tesseract :</b> Dans <font face='Courier'>ocr.py</font>, le chemin vers l'exécutable Tesseract vérifie "
        "successivement la variable <font face='Courier'>TESSERACT_CMD</font>, le répertoire standard Windows (<font face='Courier'>C:\\Program Files\\Tesseract-OCR</font>), "
        "ou laisse le système Linux utiliser le binaire global <font face='Courier'>/usr/bin/tesseract</font> présent dans le PATH.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Résolution Hybride de Poppler :</b> Même mécanisme pour la bibliothèque Poppler (<font face='Courier'>POPPLER_PATH</font>), "
        "permettant une exécution fluide sous Windows via téléchargement autonome et sous Linux via les paquets natifs du système.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>OpenCV Headless :</b> L'emploi du paquet <font face='Courier'>opencv-python-headless</font> élimine toute dépendance envers "
        "les bibliothèques graphiques X11 (libGL, Qt), prévenant les erreurs de segmentation courantes sur les serveurs conteneurisés.",
        bullet_style
    ))

    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("10. Tableau Exhaustif de la Stack Technologique", h1_style))

    tech_summary = [
        [
            Paragraph("Technologie", table_header_style),
            Paragraph("Version / Package", table_header_style),
            Paragraph("Domaine d'Application", table_header_style),
            Paragraph("Pourquoi cet outil a été choisi", table_header_style)
        ],
        [
            Paragraph("<b>FastAPI</b>", table_cell_bold),
            Paragraph("0.110+", table_cell_style),
            Paragraph("Backend API REST", table_cell_style),
            Paragraph("Asynchronisme natif, vitesse d'exécution extrême, documentation OpenAPI automatique.", table_cell_style)
        ],
        [
            Paragraph("<b>Uvicorn / Gunicorn</b>", table_cell_bold),
            Paragraph("0.28+ / 21.2+", table_cell_style),
            Paragraph("Serveur ASGI Prod", table_cell_style),
            Paragraph("Exécution asynchrone haute cadence et supervision multi-workers en production.", table_cell_style)
        ],
        [
            Paragraph("<b>MongoDB Atlas</b>", table_cell_bold),
            Paragraph("PyMongo 4.6+", table_cell_style),
            Paragraph("Base de données", table_cell_style),
            Paragraph("Flexibilité NoSQL pour schémas de factures variables, haute disponibilité cloud.", table_cell_style)
        ],
        [
            Paragraph("<b>Argon2id</b>", table_cell_bold),
            Paragraph("pwdlib[argon2]", table_cell_style),
            Paragraph("Sécurité Mots de passe", table_cell_style),
            Paragraph("Standard cryptographique maximal (PHC Winner), résistance aux attaques GPU.", table_cell_style)
        ],
        [
            Paragraph("<b>PyJWT</b>", table_cell_bold),
            Paragraph("2.8+", table_cell_style),
            Paragraph("Gestion des Sessions", table_cell_style),
            Paragraph("Authentification sans état sécurisée via Bearer Tokens signés HMAC-SHA256.", table_cell_style)
        ],
        [
            Paragraph("<b>Tesseract OCR</b>", table_cell_bold),
            Paragraph("pytesseract 0.3.10", table_cell_style),
            Paragraph("Extraction de texte", table_cell_style),
            Paragraph("Moteur OCR open source réputé, bilingue français/anglais, exécution locale gratuite.", table_cell_style)
        ],
        [
            Paragraph("<b>Poppler</b>", table_cell_bold),
            Paragraph("pdf2image 1.17+", table_cell_style),
            Paragraph("Rendu PDF", table_cell_style),
            Paragraph("Conversion haute fidélité des PDF en images matricielles (300 DPI) pour l'OCR.", table_cell_style)
        ],
        [
            Paragraph("<b>OpenCV</b>", table_cell_bold),
            Paragraph("4.9+ (headless)", table_cell_style),
            Paragraph("Vision par Ordinateur", table_cell_style),
            Paragraph("Prétraitement d'images (CLAHE) et moteur d'inférence pour modèles de visages ONNX.", table_cell_style)
        ],
        [
            Paragraph("<b>YuNet & SFace</b>", table_cell_bold),
            Paragraph("ONNX Models", table_cell_style),
            Paragraph("Biométrie Faciale", table_cell_style),
            Paragraph("Détection faciale ultra-légère et comparaison d'empreintes faciales 128D par cosinus.", table_cell_style)
        ],
        [
            Paragraph("<b>MediaPipe</b>", table_cell_bold),
            Paragraph("0.10.10+", table_cell_style),
            Paragraph("Anti-Usurpation / Liveness", table_cell_style),
            Paragraph("Maillage facial 3D, détection du clignement d'yeux (EAR) et des mouvements de tête.", table_cell_style)
        ],
        [
            Paragraph("<b>OpenRouter / GPT</b>", table_cell_bold),
            Paragraph("OpenAI SDK 1.20+", table_cell_style),
            Paragraph("Intelligence LLM", table_cell_style),
            Paragraph("Structuration JSON déterministe des factures et assistant conversationnel bilingue.", table_cell_style)
        ],
        [
            Paragraph("<b>ElevenLabs</b>", table_cell_bold),
            Paragraph("TTS API", table_cell_style),
            Paragraph("Synthèse Vocale", table_cell_style),
            Paragraph("Rendu vocal humain haute fidélité pour les réponses du chatbot d'assistance.", table_cell_style)
        ],
        [
            Paragraph("<b>OpenPyXL / ReportLab</b>", table_cell_bold),
            Paragraph("3.1+ / 4.1+", table_cell_style),
            Paragraph("Exports Comptables", table_cell_style),
            Paragraph("Génération dynamique de tableurs Excel (.xlsx) et de rapports PDF en streaming mémoire.", table_cell_style)
        ],
        [
            Paragraph("<b>React 19 & Vite 8</b>", table_cell_bold),
            Paragraph("19.2+ / 8.3+", table_cell_style),
            Paragraph("Interface Web SPA", table_cell_style),
            Paragraph("Composants déclaratifs réactifs, HMR instantané et bundle de production ultra-léger.", table_cell_style)
        ],
        [
            Paragraph("<b>Recharts</b>", table_cell_bold),
            Paragraph("3.10+", table_cell_style),
            Paragraph("Graphiques Analytics", table_cell_style),
            Paragraph("Visualisation financière interactive vectorielle (SVG) pour le tableau de bord.", table_cell_style)
        ],
    ]
    tech_table = Table(tech_summary, colWidths=[3.0 * cm, 3.0 * cm, 3.4 * cm, 8.0 * cm])
    tech_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ("PADDING", (0, 0), (-1, -1), 3.5),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("<b>Fin du Document de Spécifications Techniques.</b>", ParagraphStyle("EndDoc", fontName="Helvetica-Oblique", fontSize=9, textColor=MUTED, alignment=1)))

    # Génération du document final avec pagination dynamique
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Document PDF généré avec succès : {filename}")

if __name__ == "__main__":
    output_filename = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        "DOCUMENTATION_TECHNIQUE_COMPLETE.pdf"
    )
    create_documentation_pdf(output_filename)
