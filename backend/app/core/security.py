from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import bcrypt
from jose import jwt

from app.core.config import settings

def hash_password(password: str) -> str:
    # Use bcrypt directly to avoid passlib/bcrypt compatibility issues.
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: str = "", extra_claims: Dict[str, Any] | None = None, data: Dict[str, Any] | None = None) -> str:
    """
    Create a JWT.
    • New callers: create_access_token(subject=str(uid), extra_claims={...})
    • Legacy callers: create_access_token(data={...})  — kept for back-compat
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=settings.JWT_TTL_SECONDS)

    if data is not None:
        # Legacy: caller passes full payload dict
        payload = {**data, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    else:
        payload = {
            "sub": subject,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            **(extra_claims or {}),
        }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

