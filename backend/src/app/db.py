from dotenv import load_dotenv
load_dotenv(".env")

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.app.models_base import Base
from src.app import models_auth  # noqa: F401
from src.app import models_inventory  # noqa: F401

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing. Check backend/.env and load_dotenv.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def db_ping():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()