import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import JWTError, jwt
from passlib.context import CryptContext

from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User

load_dotenv()
# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ============================================================
# JWT SETTINGS
# ============================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ============================================================
# HTTP BEARER
# ============================================================

security = HTTPBearer()


# ============================================================
# CREATE JWT TOKEN
# ============================================================

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None
) -> str:

    to_encode = data.copy()

    if expires_delta:

        expire = (
            datetime.now(timezone.utc)
            + expires_delta
        )

    else:

        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception


    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()


    if user is None:
        raise credentials_exception


    # ========================================================
    # CHECK WHETHER USER IS ACTIVE
    # ========================================================

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )


    return user



# ============================================================
# ROLE AUTHORIZATION
# ============================================================

def require_role(required_role: str):

    def role_checker(
        current_user: User = Depends(get_current_user)
    ):

        if current_user.role != required_role.upper():

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )

        return current_user

    return role_checker