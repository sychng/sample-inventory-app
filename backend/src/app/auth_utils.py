import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def normalize_email(email: str) -> str:
    return email.strip().lower()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def _secret() -> bytes:
    s = os.getenv("SESSION_SECRET", "")
    if len(s) < 20:
        raise RuntimeError("SESSION_SECRET is missing/too short")
    return s.encode("utf-8")

def new_session_token() -> str:
    return secrets.token_urlsafe(32)

def token_hash(token: str) -> str:
    # HMAC-SHA256 so DB leak doesn't expose raw token
    return hmac.new(_secret(), token.encode("utf-8"), hashlib.sha256).hexdigest()

def session_expiry() -> datetime:
    days = int(os.getenv("SESSION_DAYS", "60"))
    return datetime.now(timezone.utc) + timedelta(days=days)

