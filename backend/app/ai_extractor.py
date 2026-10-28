import os
import json

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
Tu es un système intelligent d'extraction de données de factures
françaises et algériennes.

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

RÈGLES OBLIGATOIRES :

1. Retourne UNIQUEMENT un objet JSON valide.
2. Ne retourne aucune explication.
3. Ne retourne aucun texte avant ou après le JSON.
4. Si une information est absente ou illisible, utilise null.
5. Ne devine jamais une information.

RÈGLES POUR LES MONTANTS :

6. Les montants doivent être des nombres JSON.
7. Dans les factures françaises et algériennes, la virgule "," est
   le séparateur décimal.
8. Les espaces sont des séparateurs de milliers et doivent être supprimés.
9. Il faut conserver les décimales.

Exemples :

"20 000,00 DA" → 20000.00
"396,18 DA" → 396.18
"17,66 DA" → 17.66
"413,84 DA" → 413.84
"1 234,50 DA" → 1234.50
"50 DA" → 50.00

IMPORTANT :
"396,18" signifie 396.18 et JAMAIS 39618.
"17,66" signifie 17.66 et JAMAIS 1766.
"413,84" signifie 413.84 et JAMAIS 41384.

10. La devise "DA" doit être retournée comme "DZD".
11. Ne calcule pas les montants si la valeur n'est pas explicitement
    présente ou clairement calculable.
12. Pour invoice_number, copie exactement le numéro trouvé dans le
    texte OCR. Ne crée pas de numéro et ne modifie pas les chiffres.
13. Pour les dates, conserve le format JJ/MM/AAAA lorsqu'il est présent.

FORMAT JSON OBLIGATOIRE :

{{
    "invoice_number": null,
    "issue_date": null,
    "due_date": null,
    "supplier": null,
    "customer": null,
    "total_ht": null,
    "tax": null,
    "total_ttc": null,
    "currency": null
}}

TEXTE OCR :

{text}
"""

    model_name = os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo-16k")

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un extracteur professionnel de données "
                    "de factures. Tu retournes uniquement du JSON valide."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        response_format={
            "type": "json_object"
        },
        max_tokens=1500
    )

    result = response.choices[0].message.content

    print("\n===== RÉPONSE DE L'IA =====\n")
    print(result)

    if not result:
        raise ValueError(
            "L'IA n'a retourné aucune réponse."
        )

    result = result.strip()

    try:
        data = json.loads(result)

    except json.JSONDecodeError as e:
        raise ValueError(
            f"L'IA n'a pas retourné un JSON valide : {e}\n"
            f"Réponse reçue : {result}"
        )

    try:
        return InvoiceData.model_validate(data)

    except Exception as e:
        raise ValueError(
            f"Les données retournées par l'IA sont invalides : {e}"
        )
