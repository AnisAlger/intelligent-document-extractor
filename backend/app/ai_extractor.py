import os
from dotenv import load_dotenv
from openai import OpenAI

from app.models import InvoiceData


load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise ValueError(
        "OPENROUTER_API_KEY n'est pas configurée dans .env"
    )


client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key
)


def extract_invoice_data(text: str) -> InvoiceData:

    prompt = f"""
Tu es un système intelligent d'extraction de données de factures.

À partir du texte OCR ci-dessous, extrais les informations suivantes :

- invoice_number
- issue_date
- due_date
- supplier
- customer
- total_ht
- tax
- total_ttc
- currency

Règles importantes :

1. Retourne uniquement les informations réellement présentes.
2. Si une information est absente, utilise null.
3. Les montants doivent être des nombres sans symbole monétaire.
4. Exemple : "20 000,00 DA" doit devenir 20000.
5. La devise algérienne "DA" doit devenir "DZD".
6. Ne devine pas les informations absentes.

Texte OCR :

{text}
"""

    response = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un extracteur professionnel "
                    "de données de factures."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    result = response.choices[0].message.content

    print("\n===== RÉPONSE DE L'IA =====\n")
    print(result)

    # Supprimer les balises Markdown ```json ... ```
    result = result.strip()

    if result.startswith("```json"):
        result = result[7:]

    if result.endswith("```"):
        result = result[:-3]

    result = result.strip()

    return InvoiceData.model_validate_json(result)