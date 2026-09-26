from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class AdminCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=12, max_length=128)


class AdminPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str
    role: str = "admin"
    active: bool = True
    created_at: datetime


def normalize_email(email: str) -> str:
    return email.strip().lower()


def build_admin_document(email: str, password_hash: str) -> dict:
    return {
        "email": normalize_email(email),
        "password_hash": password_hash,
        "role": "admin",
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }