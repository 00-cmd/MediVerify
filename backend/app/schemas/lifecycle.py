from pydantic import BaseModel


class LifecycleEventCreate(BaseModel):
    event_type: str
    location: str | None = None
    notes: str | None = None