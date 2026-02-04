import os
from sqlalchemy import select

from src.app.db import SessionLocal
from src.app.models_auth import User
from src.app.auth_utils import normalize_email, hash_password


def main():
    email = normalize_email(os.getenv("ADMIN_EMAIL", "admin@company.com"))
    password = os.getenv("ADMIN_PASSWORD", "")

    if not password:
        raise RuntimeError("ADMIN_PASSWORD is missing in .env")
    if len(password) < 8:
        raise RuntimeError("ADMIN_PASSWORD too short (min 8 recommended)")

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            print("Admin already exists:", email)
            return

        u = User(
            email=email,
            password_hash=hash_password(password),
            role="ADMIN",
            is_active=True,
        )
        db.add(u)
        db.commit()
        print("Created admin:", email)
    finally:
        db.close()


if __name__ == "__main__":
    main()

