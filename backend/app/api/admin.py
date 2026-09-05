from fastapi import APIRouter, Depends ,HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    User,
    Medicine,
    Batch,
    SerializedMedicine,
    Verification,
    LifecycleEvent,
    Recall
)
from app.core.security import require_role


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# ADMIN DASHBOARD STATISTICS
# ============================================================

@router.get("/dashboard/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    # ========================================================
    # USER STATISTICS
    # ========================================================

    total_users = db.query(User).count()

    active_users = db.query(User).filter(
        User.is_active == True
    ).count()

    inactive_users = db.query(User).filter(
        User.is_active == False
    ).count()


    manufacturers = db.query(User).filter(
        User.role == "MANUFACTURER"
    ).count()

    admins = db.query(User).filter(
        User.role == "ADMIN"
    ).count()

    chemists = db.query(User).filter(
        User.role == "CHEMIST"
    ).count()


    # ========================================================
    # MEDICINE STATISTICS
    # ========================================================

    total_medicines = db.query(
        Medicine
    ).count()


    # ========================================================
    # BATCH STATISTICS
    # ========================================================

    total_batches = db.query(
        Batch
    ).count()

    active_batches = db.query(
        Batch
    ).filter(
        Batch.status == "ACTIVE"
    ).count()

    recalled_batches = db.query(
        Batch
    ).filter(
        Batch.status == "RECALLED"
    ).count()


    # ========================================================
    # SERIALIZED MEDICINE STATISTICS
    # ========================================================

    total_serialized_medicines = db.query(
        SerializedMedicine
    ).count()


    manufactured_medicines = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.status == "MANUFACTURED"
    ).count()


    # ========================================================
    # VERIFICATION STATISTICS
    # ========================================================

    total_verifications = db.query(
        Verification
    ).count()

    authentic_verifications = db.query(
        Verification
    ).filter(
        Verification.result == "AUTHENTIC"
    ).count()

    expired_verifications = db.query(
        Verification
    ).filter(
        Verification.result == "EXPIRED"
    ).count()

    recalled_verifications = db.query(
        Verification
    ).filter(
        Verification.result == "RECALLED"
    ).count()

    invalid_verifications = db.query(
        Verification
    ).filter(
        Verification.result == "INVALID"
    ).count()


    # ========================================================
    # LIFECYCLE STATISTICS
    # ========================================================

    total_lifecycle_events = db.query(
        LifecycleEvent
    ).count()

    manufactured_events = db.query(
        LifecycleEvent
    ).filter(
        LifecycleEvent.event_type == "MANUFACTURED"
    ).count()

    distributed_events = db.query(
        LifecycleEvent
    ).filter(
        LifecycleEvent.event_type == "DISTRIBUTED"
    ).count()

    received_events = db.query(
        LifecycleEvent
    ).filter(
        LifecycleEvent.event_type == "RECEIVED"
    ).count()

    sold_events = db.query(
        LifecycleEvent
    ).filter(
        LifecycleEvent.event_type == "SOLD"
    ).count()


    # ========================================================
    # RECALL STATISTICS
    # ========================================================

    total_recalls = db.query(
        Recall
    ).count()

    active_recalls = db.query(
        Recall
    ).filter(
        Recall.active == True
    ).count()


    # ========================================================
    # RETURN EVERYTHING
    # ========================================================

    return {

        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": inactive_users,
            "manufacturers": manufacturers,
            "admins": admins,
            "chemists": chemists
        },

        "medicines": {
            "total": total_medicines
        },

        "batches": {
            "total": total_batches,
            "active": active_batches,
            "recalled": recalled_batches
        },

        "serialized_medicines": {
            "total": total_serialized_medicines,
            "manufactured": manufactured_medicines
        },

        "verifications": {
            "total": total_verifications,
            "authentic": authentic_verifications,
            "expired": expired_verifications,
            "recalled": recalled_verifications,
            "invalid": invalid_verifications
        },

        "lifecycle": {
            "total": total_lifecycle_events,
            "manufactured": manufactured_events,
            "distributed": distributed_events,
            "received": received_events,
            "sold": sold_events
        },

        "recalls": {
            "total": total_recalls,
            "active": active_recalls
        }

    }

# ============================================================
# GET ALL USERS
# ============================================================

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    users = db.query(User).order_by(
        User.id.asc()
    ).all()


    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
        for user in users
    ]


# ============================================================
# DEACTIVATE USER
# ============================================================

@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    if user.id == current_user.id:

        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )


    if not user.is_active:

        raise HTTPException(
            status_code=400,
            detail="User is already inactive"
        )


    user.is_active = False

    db.commit()
    db.refresh(user)


    return {
        "message": "User deactivated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }


# ============================================================
# ACTIVATE USER
# ============================================================

@router.patch("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    if user.is_active:

        raise HTTPException(
            status_code=400,
            detail="User is already active"
        )


    user.is_active = True

    db.commit()
    db.refresh(user)


    return {
        "message": "User activated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }