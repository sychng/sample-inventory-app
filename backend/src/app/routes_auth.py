from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.app.db import get_db
from src.app.models_auth import User, Session as DbSession
from src.app.auth_utils import (
    normalize_email, verify_password, new_session_token,
    token_hash, session_expiry
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "sid"

def _cookie_kwargs():
    # In dev, Secure=False so localhost works. In prod, Secure=True.
    is_dev = True
    return dict(
        httponly=True,
        secure=not is_dev,
        samesite="lax",
        path="/",
    )

@router.post("/login")
def login(payload: dict, request: Request, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.get("email", ""))
    password = payload.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="invalid credentials")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    raw = new_session_token()
    s = DbSession(
        user_id=user.id,
        token_hash=token_hash(raw),
        expires_at=session_expiry(),
        last_seen_at=datetime.now(timezone.utc),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(s)
    db.commit()

    response.set_cookie(COOKIE_NAME, raw, max_age=60*60*24*60, **_cookie_kwargs())
    return {"ok": True, "role": user.role, "email": user.email}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        s = db.scalar(select(DbSession).where(DbSession.token_hash == token_hash(raw), DbSession.revoked_at.is_(None)))
        if s:
            s.revoked_at = datetime.now(timezone.utc)
            db.commit()

    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}

@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=401, detail="not logged in")

    sess = db.scalar(select(DbSession).where(DbSession.token_hash == token_hash(raw), DbSession.revoked_at.is_(None)))
    if not sess:
        raise HTTPException(status_code=401, detail="session invalid")

    if sess.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="session expired")

    user = db.scalar(select(User).where(User.id == sess.user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="user disabled")

    sess.last_seen_at = datetime.now(timezone.utc)
    db.commit()

    return {"email": user.email, "role": user.role}

