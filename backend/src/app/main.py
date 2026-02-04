from dotenv import load_dotenv
load_dotenv(".env")

import os
from fastapi import FastAPI

# --- App ---
app = FastAPI(title="Sample Inventory API", version="0.1.0")

# --- Routers (must be AFTER app is defined) ---
from src.app.routes_auth import router as auth_router  # noqa: E402
app.include_router(auth_router)

# --- Health ---
@app.get("/health")
def health():
    return "ok"


# --- Optional: DB health (if you already created src/app/db.py with db_ping) ---
try:
    from src.app.db import db_ping  # noqa: E402

    @app.get("/db/health")
    def db_health():
        db_ping()
        return {"db": "ok"}
except Exception:
    # If db module isn't ready yet, app can still start
    pass



from src.app.routes_inventory import router as inventory_router  # noqa: E402
app.include_router(inventory_router)

