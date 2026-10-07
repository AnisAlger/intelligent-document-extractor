from app.ocr import extract_text_from_pdf
from app.ai_extractor import extract_invoice_data


# 1. OCR du PDF
text = extract_text_from_pdf("uploads/12.pdf")

print("\n===== TEXTE OCR =====\n")
print(text)


# 2. Extraction avec l'IA
invoice = extract_invoice_data(text)

print("\n===== DONNÉES EXTRAITES PAR L'IA =====\n")
print(invoice)


# 3. Affichage JSON
print("\n===== JSON =====\n")
print(invoice.model_dump_json(indent=2))