from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from fastapi import Depends
from app.auth import get_current_admin

from app.auth import (
    create_access_token,
    TOKEN_EXPIRE_MINUTES,
)
from app.database import admins_collection
from app.models.admin import normalize_email


router = APIRouter(prefix="/api/admin", tags=["Admin"])

password_hasher = PasswordHash.recommended()


class AdminLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


@router.post("/login")
def admin_login(credentials: AdminLogin):
    email = normalize_email(str(credentials.email))

    admin = admins_collection.find_one({"email": email})

    if not admin or not password_hasher.verify(
        credentials.password,
        admin.get("password_hash", ""),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not admin.get("active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This admin account is inactive",
        )

    access_token = create_access_token(admin["email"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": TOKEN_EXPIRE_MINUTES * 60,
    }



@router.get("/me")
def get_admin_profile(
    current_admin: dict = Depends(get_current_admin),
):
    return current_admin