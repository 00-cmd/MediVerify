from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.services.qr_service import generate_qr_code
from app.db.database import get_db
from app.db.models import (
    Batch,
    Medicine,
    User,
    SerializedMedicine
)
from app.schemas.batch import (
    BatchCreate,
    SerializationRequest
)
from app.core.security import require_role


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/batches",
    tags=["Batches"]
)


# ============================================================
# CREATE BATCH
# ============================================================

@router.post("/")
def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # Check if medicine exists
    medicine = db.query(Medicine).filter(
        Medicine.id == batch_data.medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    # Check if batch number already exists
    existing_batch = db.query(Batch).filter(
        Batch.batch_number == batch_data.batch_number
    ).first()

    if existing_batch:
        raise HTTPException(
            status_code=400,
            detail="Batch number already exists"
        )

    # Validate dates
    if batch_data.expiry_date <= batch_data.manufacturing_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after manufacturing date"
        )

    # Create batch
    new_batch = Batch(
        medicine_id=batch_data.medicine_id,
        batch_number=batch_data.batch_number,
        manufacturing_date=batch_data.manufacturing_date,
        expiry_date=batch_data.expiry_date,
        status="ACTIVE"
    )

    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    return {
        "message": "Batch created successfully",
        "batch": {
            "id": new_batch.id,
            "medicine_id": new_batch.medicine_id,
            "batch_number": new_batch.batch_number,
            "manufacturing_date": new_batch.manufacturing_date,
            "expiry_date": new_batch.expiry_date,
            "status": new_batch.status
        }
    }


# ============================================================
# GET ALL BATCHES
# ============================================================

@router.get("/")
def get_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    batches = db.query(Batch).all()

    return batches


# ============================================================
# GET BATCH BY ID
# ============================================================

@router.get("/{batch_id}")
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    batch = db.query(Batch).filter(
        Batch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    return batch


# ============================================================
# GET SERIALIZED MEDICINES FOR BATCH
# ============================================================

@router.get("/{batch_id}/serialized")
def get_serialized_medicines(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # Check batch exists
    batch = db.query(Batch).filter(
        Batch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # Get serialized medicines
    serialized_medicines = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.batch_id == batch_id
    ).all()

    return [
        {
            "id": medicine.id,
            "serial_number": medicine.serial_number,
            "qr_token": medicine.qr_token,
            "status": medicine.status
        }
        for medicine in serialized_medicines
    ]

# ============================================================
# SERIALIZE BATCH
# ============================================================

@router.post("/{batch_id}/serialize")
def serialize_batch(
    batch_id: int,
    serialization_data: SerializationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # --------------------------------------------------------
    # CHECK QUANTITY
    # --------------------------------------------------------

    if serialization_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    # --------------------------------------------------------
    # CHECK BATCH
    # --------------------------------------------------------

    batch = db.query(Batch).filter(
        Batch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # --------------------------------------------------------
    # CHECK BATCH STATUS
    # --------------------------------------------------------

    if batch.status == "RECALLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot serialize a recalled batch"
        )

    # --------------------------------------------------------
    # FIND EXISTING SERIALIZED MEDICINES
    # --------------------------------------------------------

    existing_count = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.batch_id == batch_id
    ).count()

    # --------------------------------------------------------
    # GENERATE SERIAL NUMBERS
    # --------------------------------------------------------

    generated_medicines = []

    for i in range(serialization_data.quantity):

        serial_number = (
            f"{batch.batch_number}-"
            f"{existing_count + i + 1:06d}"
        )

        qr_token = str(uuid.uuid4())

        serialized_medicine = SerializedMedicine(
            batch_id=batch.id,
            serial_number=serial_number,
            qr_token=qr_token,
            status="MANUFACTURED"
        )

        db.add(serialized_medicine)

        generated_medicines.append({
            "serial_number": serial_number,
            "qr_token": qr_token,
            "status": "MANUFACTURED"
        })

    # --------------------------------------------------------
    # SAVE TO DATABASE
    # --------------------------------------------------------

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to serialize batch"
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Batch serialized successfully",
        "batch_id": batch.id,
        "quantity": serialization_data.quantity,
        "medicines": generated_medicines
    }


# ============================================================
# GENERATE QR CODES
# ============================================================

@router.post("/{batch_id}/generate-qr")
def generate_batch_qr_codes(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # --------------------------------------------------------
    # CHECK BATCH
    # --------------------------------------------------------

    batch = db.query(Batch).filter(
        Batch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # --------------------------------------------------------
    # GET SERIALIZED MEDICINES
    # --------------------------------------------------------

    serialized_medicines = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.batch_id == batch_id
    ).all()

    if not serialized_medicines:
        raise HTTPException(
            status_code=404,
            detail="No serialized medicines found for this batch"
        )

    # --------------------------------------------------------
    # CREATE QR DIRECTORY
    # --------------------------------------------------------

    qr_directory = Path("qr_codes")

    qr_directory.mkdir(
        exist_ok=True
    )

    generated_qrs = []

    # --------------------------------------------------------
    # GENERATE QR FOR EACH MEDICINE
    # --------------------------------------------------------

    for medicine in serialized_medicines:

        file_path = (
            qr_directory
            / f"{medicine.serial_number}.png"
        )

        generate_qr_code(
            medicine.qr_token,
            str(file_path)
        )

        generated_qrs.append({
            "serial_number": medicine.serial_number,
            "qr_token": medicine.qr_token,
            "file": str(file_path)
        })

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "QR codes generated successfully",
        "batch_id": batch_id,
        "quantity": len(generated_qrs),
        "qrs": generated_qrs
    }