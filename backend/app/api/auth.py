from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
    require_role
)
# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):

    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role.upper()
    )

    # Save user
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/login", response_model=Token)
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == user_data.email
    ).first()


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )


    if not verify_password(
        user_data.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role
        },
        expires_delta=timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }
# ============================================================
# MANUFACTURER TEST ENDPOINT
# ============================================================

@router.get("/manufacturer-test")
def manufacturer_test(
    current_user: User = Depends(
        require_role("MANUFACTURER")
    )
):

    return {
        "message": "Manufacturer authorization successful",
        "user": current_user.name,
        "role": current_user.role
    }