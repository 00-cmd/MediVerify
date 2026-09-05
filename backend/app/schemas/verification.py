from pydantic import BaseModel


class LifecycleEventResponse(BaseModel):

    event_type: str

    location: str | None = None

    timestamp: str | None = None

    notes: str | None = None


class VerificationResponse(BaseModel):

    result: str

    serial_number: str | None = None

    medicine_name: str | None = None

    batch_number: str | None = None

    expiry_date: str | None = None

    message: str

    lifecycle: list[dict] = []