from pydantic import BaseModel


class VerificationResponse(BaseModel):

    result: str

    serial_number: str | None = None

    medicine_name: str | None = None

    batch_number: str | None = None

    expiry_date: str | None = None

    message: str