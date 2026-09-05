from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    LifecycleEvent,
    SerializedMedicine,
    User
)
from app.schemas.lifecycle import LifecycleEventCreate
from app.core.security import require_role


router = APIRouter(
    prefix="/lifecycle",
    tags=["Lifecycle"]
)


ALLOWED_EVENTS = {
    "MANUFACTURED",
    "DISTRIBUTED",
    "RECEIVED",
    "SOLD"
}


@router.post("/{serialized_medicine_id}")
def add_lifecycle_event(
    serialized_medicine_id: int,
    event_data: LifecycleEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):
    serialized_medicine = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.id == serialized_medicine_id
    ).first()

    if not serialized_medicine:
        raise HTTPException(
            status_code=404,
            detail="Serialized medicine not found"
        )

    event_type = event_data.event_type.upper()

    if event_type not in ALLOWED_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid event type. "
                "Allowed events: "
                "MANUFACTURED, DISTRIBUTED, "
                "RECEIVED, SOLD"
            )
        )

    new_event = LifecycleEvent(
        serialized_medicine_id=serialized_medicine.id,
        actor_id=current_user.id,
        event_type=event_type,
        location=event_data.location,
        notes=event_data.notes
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return {
        "message": "Lifecycle event added successfully",
        "event": {
            "id": new_event.id,
            "serialized_medicine_id":
                new_event.serialized_medicine_id,
            "event_type": new_event.event_type,
            "location": new_event.location,
            "timestamp": new_event.timestamp,
            "notes": new_event.notes
        }
    }


@router.get("/{serialized_medicine_id}")
def get_lifecycle_history(
    serialized_medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):
    serialized_medicine = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.id == serialized_medicine_id
    ).first()

    if not serialized_medicine:
        raise HTTPException(
            status_code=404,
            detail="Serialized medicine not found"
        )

    events = db.query(
        LifecycleEvent
    ).filter(
        LifecycleEvent.serialized_medicine_id
        == serialized_medicine_id
    ).order_by(
        LifecycleEvent.timestamp.asc()
    ).all()

    return {
        "serialized_medicine_id":
            serialized_medicine.id,
        "serial_number":
            serialized_medicine.serial_number,
        "events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "location": event.location,
                "timestamp": event.timestamp,
                "notes": event.notes,
                "actor_id": event.actor_id
            }
            for event in events
        ]
    }