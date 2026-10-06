from pydantic import BaseModel
from typing import Optional


class InvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None

    supplier: Optional[str] = None
    customer: Optional[str] = None

    total_ht: Optional[float] = None
    tax: Optional[float] = None
    total_ttc: Optional[float] = None

    currency: Optional[str] = None