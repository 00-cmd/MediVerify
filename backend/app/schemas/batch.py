from datetime import date

from pydantic import BaseModel


class BatchCreate(BaseModel):

    medicine_id: int

    batch_number: str

    manufacturing_date: date

    expiry_date: date


class SerializationRequest(BaseModel):

    quantity: int