from dotenv import load_dotenv
load_dotenv(".env")

from fastapi import FastAPI

from src.app import models_auth  # noqa: F401
from src.app import models_inventory  # noqa: F401
from src.app.routes_auth import router as auth_router
from src.app.routes_inventory import router as inventory_router
from src.app.db import db_ping

app = FastAPI(title="Sample Inventory API", version="0.1.0")

app.include_router(auth_router)
app.include_router(inventory_router)


@app.get("/health")
def health():
    return "ok"


@app.get("/db/health")
def db_health():
    db_ping()
    return {"db": "ok"}