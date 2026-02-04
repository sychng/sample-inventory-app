from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.app.db import get_db
from src.app.models_auth import User, Session as DbSession
from src.app.auth_utils import token_hash

COOKIE_NAME = "sid"

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=401, detail="not logged in")

    sess = db.scalar(select(DbSession).where(DbSession.token_hash == token_hash(raw), DbSession.revoked_at.is_(None)))
    if not sess or sess.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="session invalid")

    user = db.scalar(select(User).where(User.id == sess.user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="user disabled")

    sess.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return user

