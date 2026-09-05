from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.services.qr_service import generate_qr_code
from app.db.database import get_db
from app.db.models import Batch, Medicine, User, SerializedMedicine
from app.schemas.batch import BatchCreate, SerializationRequest
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

    # --------------------------------------------------------
    # Check that the medicine exists AND belongs to
    # the currently logged-in manufacturer
    # --------------------------------------------------------

    medicine = db.query(Medicine).filter(
        Medicine.id == batch_data.medicine_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    # --------------------------------------------------------
    # Check duplicate batch number
    # --------------------------------------------------------

    existing_batch = db.query(Batch).filter(
        Batch.batch_number == batch_data.batch_number
    ).first()

    if existing_batch:
        raise HTTPException(
            status_code=400,
            detail="Batch number already exists"
        )

    # --------------------------------------------------------
    # Validate dates
    # --------------------------------------------------------

    if batch_data.expiry_date <= batch_data.manufacturing_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after manufacturing date"
        )

    # --------------------------------------------------------
    # Create batch
    # --------------------------------------------------------

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

    # Only return batches belonging to medicines
    # owned by the logged-in manufacturer

    batches = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Medicine.manufacturer_id == current_user.id
    ).all()

    return batches


# ============================================================
# GET SERIALIZED MEDICINES FOR A BATCH
# ============================================================

@router.get("/{batch_id}/serialized")
def get_serialized_medicines(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # --------------------------------------------------------
    # Verify that this batch belongs to the manufacturer
    # --------------------------------------------------------

    batch = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Batch.id == batch_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # --------------------------------------------------------
    # Get serialized medicines
    # --------------------------------------------------------

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
# GET BATCH BY ID
# IMPORTANT:
# This must remain AFTER /{batch_id}/serialized
# ============================================================

@router.get("/{batch_id}")
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    # --------------------------------------------------------
    # Only allow access if the batch belongs to a medicine
    # owned by the current manufacturer
    # --------------------------------------------------------

    batch = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Batch.id == batch_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    return batch


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
    # Validate quantity
    # --------------------------------------------------------

    if serialization_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    # --------------------------------------------------------
    # Verify batch ownership
    # --------------------------------------------------------

    batch = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Batch.id == batch_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # --------------------------------------------------------
    # Prevent serialization of recalled batch
    # --------------------------------------------------------

    if batch.status == "RECALLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot serialize a recalled batch"
        )

    # --------------------------------------------------------
    # Find existing serialized medicines
    # --------------------------------------------------------

    existing_count = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.batch_id == batch_id
    ).count()

    generated_medicines = []

    # --------------------------------------------------------
    # Generate serialized medicines
    # --------------------------------------------------------

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
    # Save to database
    # --------------------------------------------------------

    try:

        db.commit()

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to serialize batch"
        )

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
    # Verify batch ownership
    # --------------------------------------------------------

    batch = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Batch.id == batch_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    # --------------------------------------------------------
    # Get serialized medicines
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
    # Create QR directory
    # --------------------------------------------------------

    qr_directory = Path("qr_codes")
    qr_directory.mkdir(exist_ok=True)

    generated_qrs = []

    # --------------------------------------------------------
    # Generate QR for every serialized medicine
    # --------------------------------------------------------

    for medicine in serialized_medicines:

        file_path = (
            qr_directory /
            f"{medicine.serial_number}.png"
        )

        verification_url = (
            "http://127.0.0.1:5500/frontend/"
            f"verification.html?token={medicine.qr_token}"
        )

        generate_qr_code(
            verification_url,
            str(file_path)
        )

        generated_qrs.append({
            "serial_number": medicine.serial_number,
            "qr_token": medicine.qr_token,
            "file": str(file_path),
            "verification_url": verification_url
        })

    return {
        "message": "QR codes generated successfully",
        "batch_id": batch_id,
        "quantity": len(generated_qrs),
        "qrs": generated_qrs
    }