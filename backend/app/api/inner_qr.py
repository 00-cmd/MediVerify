from datetime import datetime, timezone
from urllib.request import Request as URLRequest, urlopen
from urllib.parse import quote
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    InnerQRAuthentication,
    SerializedMedicine,
    Batch,
    Medicine,
    User
)
from app.core.security import require_role


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/inner-qr",
    tags=["Inner QR Authentication"]
)


# ============================================================
# IP GEOLOCATION
# ============================================================

def get_ip_location(ip_address: str):

    try:

        encoded_ip = quote(ip_address, safe="")

        url = (
            f"https://ipapi.co/"
            f"{encoded_ip}/json/"
        )

        request = URLRequest(
            url,
            headers={
                "User-Agent": "MediVerify/1.0"
            }
        )

        with urlopen(
            request,
            timeout=5
        ) as response:

            data = json.loads(
                response.read().decode("utf-8")
            )

        if data.get("error"):
            return None

        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if latitude is None or longitude is None:
            return None

        city = data.get("city")
        region = data.get("region")
        country = data.get("country_name")

        location_parts = [
            value
            for value in [
                city,
                region,
                country
            ]
            if value
        ]

        location = ", ".join(location_parts)

        return {
            "location": location or "Approximate location unavailable",
            "latitude": float(latitude),
            "longitude": float(longitude)
        }

    except Exception:

        return None


# ============================================================
# GET INNER QR TOKEN
# MANUFACTURER ONLY
# ============================================================

@router.get("/{serialized_medicine_id}")
def get_inner_qr_token(
    serialized_medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    serialized_medicine = (
        db.query(SerializedMedicine)
        .join(
            Batch,
            SerializedMedicine.batch_id == Batch.id
        )
        .join(
            Medicine,
            Batch.medicine_id == Medicine.id
        )
        .filter(
            SerializedMedicine.id == serialized_medicine_id,
            Medicine.manufacturer_id == current_user.id
        )
        .first()
    )

    if not serialized_medicine:

        raise HTTPException(
            status_code=404,
            detail="Serialized medicine not found"
        )

    inner_qr = db.query(
        InnerQRAuthentication
    ).filter(
        InnerQRAuthentication.serialized_medicine_id
        == serialized_medicine.id
    ).first()

    if not inner_qr:

        raise HTTPException(
            status_code=404,
            detail="Inner QR authentication record not found"
        )

    return {
        "serialized_medicine_id": serialized_medicine.id,
        "serial_number": serialized_medicine.serial_number,
        "authentication_token": inner_qr.authentication_token,
        "is_used": inner_qr.is_used
    }


# ============================================================
# VERIFY INNER QR
# PUBLIC ENDPOINT
# ============================================================

@router.post("/verify")
def verify_inner_qr(
    request: Request,
    authentication_token: str,
    latitude: float | None = None,
    longitude: float | None = None,
    location_permission: bool = False,
    device: str | None = None,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find Inner QR record
    # --------------------------------------------------------

    inner_qr = db.query(
        InnerQRAuthentication
    ).filter(
        InnerQRAuthentication.authentication_token
        == authentication_token
    ).first()

    if not inner_qr:

        raise HTTPException(
            status_code=404,
            detail="Invalid Inner QR authentication token"
        )

    # --------------------------------------------------------
    # Determine location
    # --------------------------------------------------------

    location = None
    location_source = None
    final_latitude = None
    final_longitude = None

    # --------------------------------------------------------
    # OPTION 1: BROWSER GPS
    # --------------------------------------------------------

    if (
        location_permission
        and latitude is not None
        and longitude is not None
    ):

        final_latitude = latitude
        final_longitude = longitude

        location = (
            f"{latitude:.6f}, "
            f"{longitude:.6f}"
        )

        location_source = "GPS"

    # --------------------------------------------------------
    # OPTION 2: IP GEOLOCATION FALLBACK
    # --------------------------------------------------------

    else:

        client_ip = None

        # ----------------------------------------------------
        # Try proxy-provided client IP first
        # ----------------------------------------------------

        forwarded_for = request.headers.get(
            "x-forwarded-for"
        )

        if forwarded_for:

            client_ip = (
                forwarded_for
                .split(",")[0]
                .strip()
            )

        # ----------------------------------------------------
        # Fall back to direct client IP
        # ----------------------------------------------------

        if not client_ip and request.client:

            client_ip = request.client.host

        # ----------------------------------------------------
        # Ignore localhost/private development addresses
        # because they cannot provide useful public
        # geolocation.
        # ----------------------------------------------------

        if client_ip in {
            "127.0.0.1",
            "::1",
            "localhost"
        }:

            client_ip = None

        # ----------------------------------------------------
        # Perform actual IP geolocation
        # ----------------------------------------------------

        if client_ip:

            ip_location = get_ip_location(
                client_ip
            )

            if ip_location:

                location = ip_location["location"]

                final_latitude = (
                    ip_location["latitude"]
                )

                final_longitude = (
                    ip_location["longitude"]
                )

                location_source = "IP"

    # --------------------------------------------------------
    # FIRST AUTHENTICATION
    # --------------------------------------------------------

    verification_time = (
        datetime.now(timezone.utc)
        .replace(tzinfo=None)
    )

    update_statement = (
        update(InnerQRAuthentication)
        .where(
            InnerQRAuthentication.id
            == inner_qr.id,

            InnerQRAuthentication.is_used
            == False
        )
        .values(
            is_used=True,
            first_verified_at=verification_time,
            first_verified_location=location,
            first_verified_location_source=location_source,
            first_verified_latitude=final_latitude,
            first_verified_longitude=final_longitude,
            first_verified_device=device
        )
    )

    result = db.execute(
        update_statement
    )

    # --------------------------------------------------------
    # FIRST SCAN SUCCESS
    # --------------------------------------------------------

    if result.rowcount == 1:

        db.commit()

        return {
            "status": "AUTHENTICATED",
            "message": "Inner QR authenticated successfully",
            "is_used": True,
            "first_verified_at": verification_time,
            "first_verified_location": location,
            "first_verified_location_source": location_source,
            "first_verified_latitude": final_latitude,
            "first_verified_longitude": final_longitude,
            "first_verified_device": device
        }

    # --------------------------------------------------------
    # ALREADY USED
    # --------------------------------------------------------

    db.rollback()

    existing_record = db.query(
        InnerQRAuthentication
    ).filter(
        InnerQRAuthentication.id == inner_qr.id
    ).first()

    return {
        "status": "ALREADY_AUTHENTICATED",
        "message": "This Inner QR has already been authenticated",
        "is_used": True,
        "first_verified_at": existing_record.first_verified_at,
        "first_verified_location": (
            existing_record.first_verified_location
        ),
        "first_verified_location_source": (
            existing_record.first_verified_location_source
        ),
        "first_verified_latitude": (
            existing_record.first_verified_latitude
        ),
        "first_verified_longitude": (
            existing_record.first_verified_longitude
        ),
        "first_verified_device": (
            existing_record.first_verified_device
        )
    }