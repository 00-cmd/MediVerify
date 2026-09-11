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


router = APIRouter(
    prefix="/inner-qr",
    tags=["Inner QR Authentication"]
)


# ============================================================
# GPS REVERSE GEOCODING
# ============================================================

def reverse_geocode(latitude: float, longitude: float):
    """
    Convert GPS coordinates into a human-readable location
    using OpenStreetMap Nominatim.
    """

    try:

        url = (
            "https://nominatim.openstreetmap.org/reverse"
            f"?lat={latitude}"
            f"&lon={longitude}"
            "&format=json"
            "&zoom=10"
            "&addressdetails=1"
        )

        request = URLRequest(
            url,
            headers={
                "User-Agent": "MediVerify/1.0"
            }
        )

        with urlopen(request, timeout=5) as response:

            data = json.loads(
                response.read().decode("utf-8")
            )

        address = data.get("address", {})

        city = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
        )

        state = address.get("state")

        country = address.get("country")

        location_parts = [
            value
            for value in [city, state, country]
            if value
        ]

        if not location_parts:
            return None

        return ", ".join(location_parts)

    except Exception:

        return None


# ============================================================
# IP LOCATION FALLBACK
# ============================================================

def get_ip_location(ip_address: str):

    try:

        encoded_ip = quote(
            ip_address,
            safe=""
        )

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

        location = ", ".join(
            location_parts
        )

        return {
            "location": (
                location
                or "Approximate location unavailable"
            ),
            "latitude": float(latitude),
            "longitude": float(longitude)
        }

    except Exception:

        return None


# ============================================================
# GET INNER QR TOKEN
# ============================================================

@router.get("/{serialized_medicine_id}")
def get_inner_qr_token(
    serialized_medicine_id: int,
    current_user: User = Depends(
        require_role("MANUFACTURER")
    ),
    db: Session = Depends(get_db)
):

    serialized_medicine = db.query(
        SerializedMedicine
    ).filter(
        SerializedMedicine.id ==
        serialized_medicine_id
    ).first()

    if not serialized_medicine:

        raise HTTPException(
            status_code=404,
            detail="Serialized medicine not found"
        )

    batch = db.query(Batch).filter(
        Batch.id ==
        serialized_medicine.batch_id
    ).first()

    if not batch:

        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    medicine = db.query(Medicine).filter(
        Medicine.id ==
        batch.medicine_id
    ).first()

    if not medicine:

        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    if medicine.manufacturer_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="You do not own this medicine"
        )

    inner_qr = db.query(
        InnerQRAuthentication
    ).filter(
        InnerQRAuthentication.serialized_medicine_id ==
        serialized_medicine_id
    ).first()

    if not inner_qr:

        raise HTTPException(
            status_code=404,
            detail="Inner QR authentication record not found"
        )

    return {
        "serialized_medicine_id":
            serialized_medicine.id,

        "serial_number":
            serialized_medicine.serial_number,

        "authentication_token":
            inner_qr.authentication_token,

        "is_used":
            inner_qr.is_used
    }


# ============================================================
# VERIFY INNER QR
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

    # ========================================================
    # FIND TOKEN
    # ========================================================

    inner_qr = db.query(
        InnerQRAuthentication
    ).filter(
        InnerQRAuthentication.authentication_token ==
        authentication_token
    ).first()

    if not inner_qr:

        raise HTTPException(
            status_code=404,
            detail="Invalid Inner QR authentication token"
        )


    # ========================================================
    # LOCATION VARIABLES
    # ========================================================

    verified_location = None
    location_source = None
    verified_latitude = None
    verified_longitude = None


    # ========================================================
    # GPS LOCATION
    # ========================================================

    if (
        location_permission
        and latitude is not None
        and longitude is not None
    ):

        verified_latitude = latitude
        verified_longitude = longitude

        # Reverse GPS coordinates into location name
        verified_location = reverse_geocode(
            latitude,
            longitude
        )

        if verified_location:

            location_source = "GPS"

        else:

            # Keep coordinates if reverse geocoding fails
            verified_location = (
                f"{latitude:.6f}, "
                f"{longitude:.6f}"
            )

            location_source = "GPS"


    # ========================================================
    # IP LOCATION FALLBACK
    # ========================================================

    if verified_location is None:

        client_ip = None

        forwarded_for = request.headers.get(
            "X-Forwarded-For"
        )

        if forwarded_for:

            client_ip = (
                forwarded_for
                .split(",")[0]
                .strip()
            )

        elif request.client:

            client_ip = request.client.host


        # Don't attempt IP lookup for localhost
        if client_ip in [
            "127.0.0.1",
            "::1",
            "localhost"
        ]:

            client_ip = None


        if client_ip:

            ip_location = get_ip_location(
                client_ip
            )

            if ip_location:

                verified_location = (
                    ip_location["location"]
                )

                verified_latitude = (
                    ip_location["latitude"]
                )

                verified_longitude = (
                    ip_location["longitude"]
                )

                location_source = "IP"


    # ========================================================
    # CURRENT UTC TIME
    # ========================================================

    verified_at = datetime.now(
        timezone.utc
    ).replace(
        tzinfo=None
    )


    # ========================================================
    # ATOMIC ONE-TIME AUTHENTICATION
    # ========================================================

    result = db.execute(
        update(InnerQRAuthentication)
        .where(
            InnerQRAuthentication.id ==
            inner_qr.id,

            InnerQRAuthentication.is_used ==
            False
        )
        .values(
            is_used=True,

            first_verified_at=
                verified_at,

            first_verified_location=
                verified_location,

            first_verified_location_source=
                location_source,

            first_verified_latitude=
                verified_latitude,

            first_verified_longitude=
                verified_longitude,

            first_verified_device=
                device
        )
    )


    # ========================================================
    # FIRST SUCCESSFUL SCAN
    # ========================================================

    if result.rowcount == 1:

        db.commit()

        return {
            "status": "AUTHENTICATED",

            "message":
                "Inner QR authenticated successfully",

            "is_used": True,

            "first_verified_at":
                verified_at,

            "first_verified_location":
                verified_location,

            "first_verified_location_source":
                location_source,

            "first_verified_latitude":
                verified_latitude,

            "first_verified_longitude":
                verified_longitude,

            "first_verified_device":
                device
        }


    # ========================================================
    # ALREADY AUTHENTICATED
    # ========================================================

    db.rollback()

    db.refresh(inner_qr)

    return {
        "status":
            "ALREADY_AUTHENTICATED",

        "message":
            "This Inner QR has already been authenticated",

        "is_used":
            True,

        "first_verified_at":
            inner_qr.first_verified_at,

        "first_verified_location":
            inner_qr.first_verified_location,

        "first_verified_location_source":
            inner_qr.first_verified_location_source,

        "first_verified_latitude":
            inner_qr.first_verified_latitude,

        "first_verified_longitude":
            inner_qr.first_verified_longitude,

        "first_verified_device":
            inner_qr.first_verified_device
    }