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

        # Manufacturer account that is currently logged in
        manufacturer_id=current_user.id,

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

    medicines = db.query(Medicine).filter(
        Medicine.manufacturer_id == current_user.id
    ).all()

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

    # Only count this manufacturer's medicines
    total_medicines = db.query(Medicine).filter(
        Medicine.manufacturer_id == current_user.id
    ).count()

    # Only count batches belonging to this manufacturer's medicines
    total_batches = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Medicine.manufacturer_id == current_user.id
    ).count()

    # Only count serialized medicines belonging to this manufacturer's batches
    total_serialized = db.query(
        SerializedMedicine
    ).join(
        Batch,
        SerializedMedicine.batch_id == Batch.id
    ).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Medicine.manufacturer_id == current_user.id
    ).count()

    # Only count active batches belonging to this manufacturer
    active_batches = db.query(Batch).join(
        Medicine,
        Batch.medicine_id == Medicine.id
    ).filter(
        Medicine.manufacturer_id == current_user.id,
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
        Medicine.id == medicine_id,
        Medicine.manufacturer_id == current_user.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    return medicine