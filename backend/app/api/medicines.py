from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Medicine, Batch, SerializedMedicine, User
from app.schemas.medicine import MedicineCreate
from app.core.security import require_role


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/medicines",
    tags=["Medicines"]
)


# ============================================================
# CREATE MEDICINE
# ============================================================

@router.post("/")
def create_medicine(
    medicine_data: MedicineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    new_medicine = Medicine(
        name=medicine_data.name,
        manufacturer_name=medicine_data.manufacturer_name,
        composition=medicine_data.composition,
        description=medicine_data.description
    )

    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)

    return {
        "message": "Medicine created successfully",
        "medicine": {
            "id": new_medicine.id,
            "name": new_medicine.name,
            "manufacturer_name": new_medicine.manufacturer_name,
            "composition": new_medicine.composition,
            "description": new_medicine.description
        }
    }


# ============================================================
# GET ALL MEDICINES
# ============================================================

@router.get("/")
def get_medicines(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    medicines = db.query(Medicine).all()

    return medicines


# ============================================================
# GET DASHBOARD STATISTICS
# IMPORTANT: THIS MUST COME BEFORE /{medicine_id}
# ============================================================

@router.get("/stats")
def get_medicine_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    total_medicines = db.query(Medicine).count()

    total_batches = db.query(Batch).count()

    total_serialized = db.query(
        SerializedMedicine
    ).count()

    active_batches = db.query(Batch).filter(
        Batch.status == "ACTIVE"
    ).count()

    return {
        "total_medicines": total_medicines,
        "total_batches": total_batches,
        "total_serialized": total_serialized,
        "active_batches": active_batches
    }


# ============================================================
# GET MEDICINE BY ID
# ============================================================

@router.get("/{medicine_id}")
def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    return medicine