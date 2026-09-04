from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Batch, Recall, User
from app.core.security import require_role


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.post("/batches/{batch_id}/recall")
def recall_batch(
    batch_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
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

    if batch.status == "RECALLED":
        raise HTTPException(
            status_code=400,
            detail="Batch is already recalled"
        )

    recall = Recall(
        batch_id=batch.id,
        reason=reason,
        issued_by=current_user.id,
        active=True
    )

    batch.status = "RECALLED"

    db.add(recall)
    db.commit()
    db.refresh(recall)

    return {
        "message": "Batch recalled successfully",
        "batch_id": batch.id,
        "batch_number": batch.batch_number,
        "reason": reason,
        "status": batch.status
    }