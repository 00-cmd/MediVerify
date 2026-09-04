from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    SerializedMedicine,
    Verification
)

from app.schemas.verification import VerificationResponse


router = APIRouter(
    prefix="/verify",
    tags=["Verification"]
)


@router.get(
    "/{qr_token}",
    response_model=VerificationResponse
)
def verify_medicine(
    qr_token: str,
    db: Session = Depends(get_db)
):

    serialized_medicine = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.qr_token == qr_token
    ).first()

    if not serialized_medicine:
        return {
            "result": "INVALID",
            "message": "Medicine could not be verified"
        }

    batch = serialized_medicine.batch
    medicine = batch.medicine

    # Check if batch is recalled
    if batch.status == "RECALLED":

        verification = Verification(
            serialized_medicine_id=serialized_medicine.id,
            result="RECALLED"
        )

        db.add(verification)
        db.commit()

        return {
            "result": "RECALLED",
            "serial_number": serialized_medicine.serial_number,
            "medicine_name": medicine.name,
            "batch_number": batch.batch_number,
            "expiry_date": str(batch.expiry_date),
            "message": "Medicine is authentic but this batch has been recalled"
        }

    # Check expiry
    if batch.expiry_date < date.today():

        verification = Verification(
            serialized_medicine_id=serialized_medicine.id,
            result="EXPIRED"
        )

        db.add(verification)
        db.commit()

        return {
            "result": "EXPIRED",
            "serial_number": serialized_medicine.serial_number,
            "medicine_name": medicine.name,
            "batch_number": batch.batch_number,
            "expiry_date": str(batch.expiry_date),
            "message": "Medicine is authentic but has expired"
        }

    # Medicine is authentic and not expired
    verification = Verification(
        serialized_medicine_id=serialized_medicine.id,
        result="AUTHENTIC"
    )

    db.add(verification)
    db.commit()

    return {
        "result": "AUTHENTIC",
        "serial_number": serialized_medicine.serial_number,
        "medicine_name": medicine.name,
        "batch_number": batch.batch_number,
        "expiry_date": str(batch.expiry_date),
        "message": "Medicine verified successfully"
    }