import os
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from app.database import admins_collection

security = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing from backend/.env")

password_hasher = PasswordHash.recommended()

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(email: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": email,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    print("AUTH DEBUG path:", request.url.path)

    # Keep the rest of your existing function unchanged:
    if credentials is None:
        print("AUTH DEBUG: No Bearer token received")
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        print("AUTH DEBUG: JWT verified successfully")

    except jwt.ExpiredSignatureError:
        print("AUTH DEBUG: Token expired")
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError as e:
        print(f"AUTH DEBUG: JWT verification failed: {type(e).__name__}")
        raise HTTPException(status_code=401, detail="JWT verification failed")

    email = payload.get("sub")

    if not email:
        print("AUTH DEBUG: JWT subject is missing")
        raise HTTPException(status_code=401, detail="Missing token subject")

    admin = admins_collection.find_one({"email": email})

    if not admin:
        print("AUTH DEBUG: Token valid, but admin email not found in database")
        raise HTTPException(status_code=401, detail="Admin not found")

    if not admin.get("active", False):
        print("AUTH DEBUG: Admin account is inactive")
        raise HTTPException(status_code=401, detail="Admin inactive")

    print("AUTH DEBUG: Admin authenticated successfully")

    return {
        "email": admin["email"],
        "role": admin.get("role", "admin"),
    }
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )

        email = payload.get("sub")

        if not email:
            raise unauthorized

    except jwt.InvalidTokenError:
        raise unauthorized

    admin = admins_collection.find_one({"email": email})

    if not admin or not admin.get("active", False):
        raise unauthorized

    return {
        "email": admin["email"],
        "role": admin.get("role", "admin"),
    }