from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.app.db import get_db
from src.app.deps import get_current_user
from src.app.models_auth import User
from src.app.models_inventory import Sample, Loan

router = APIRouter(tags=["inventory"])

@router.post("/samples")
def create_sample(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sku = (payload.get("sku") or "").strip()
    name = (payload.get("name") or "").strip()
    if not sku or not name:
        raise HTTPException(status_code=400, detail="sku and name required")

    s = Sample(
        sku=sku,
        name=name,
        category=payload.get("category"),
        lot_id=payload.get("lot_id"),
        location=payload.get("location"),
        is_active=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": str(s.id)}

@router.get("/samples")
def list_samples(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Sample).where(Sample.is_active.is_(True)).order_by(Sample.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where((Sample.sku.ilike(like)) | (Sample.name.ilike(like)) | (Sample.lot_id.ilike(like)))
    rows = db.scalars(stmt).all()
    return [
        {
            "id": str(s.id),
            "sku": s.sku,
            "name": s.name,
            "category": s.category,
            "lot_id": s.lot_id,
            "location": s.location,
            "created_at": s.created_at,
        }
        for s in rows
    ]

@router.post("/loans")
def loan_sample(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sample_id = payload.get("sample_id")
    if not sample_id:
        raise HTTPException(status_code=400, detail="sample_id required")

    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    sample = db.scalar(select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    # enforce one active loan per sample
    active = db.scalar(select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None)))
    if active:
        raise HTTPException(status_code=409, detail="sample already on loan")

    loan = Loan(
        sample_id=sample.id,
        borrower_user_id=user.id,
        due_at=payload.get("due_at"),
        remarks=payload.get("remarks"),
        out_at=datetime.now(timezone.utc),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return {"loan_id": str(loan.id)}

@router.post("/loans/{loan_id}/return")
def return_loan(loan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    loan = db.scalar(select(Loan).where(Loan.id == loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="loan not found")
    if loan.returned_at:
        return {"ok": True}

    # optional rule: only borrower or admin can return
    if loan.borrower_user_id != user.id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="not allowed")

    loan.returned_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/scan/{code}")
def scan_resolver(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    code = (code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code required")

    sample = None

    # 1) If UUID -> treat as Sample.id
    try:
        code_uuid = UUID(code)
        sample = db.scalar(select(Sample).where(Sample.id == code_uuid, Sample.is_active.is_(True)))
    except Exception:
        sample = None

    # 2) Else treat as SKU
    if sample is None:
        sample = db.scalar(select(Sample).where(Sample.sku == code, Sample.is_active.is_(True)))

    # Found a sample
    if sample is not None:
        active_loan = db.scalar(
            select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None))
        )
        return {
            "kind": "sample",
            "sample": {
                "id": str(sample.id),
                "sku": sample.sku,
                "name": sample.name,
                "division": getattr(sample, "division", None),
                "family": getattr(sample, "family", None),
                "series": getattr(sample, "series", None),
                "model": getattr(sample, "model", None),
                # your DB column is `location`, but frontend expects `location_code`
                "location_code": sample.location,
                "is_loaned": bool(active_loan),
            },
        }

    # 3) Not a sample -> treat as location code (always resolves)
    return {"kind": "location", "location_code": code}

@router.post("/samples/{sample_id}/move")
def move_sample(sample_id: str, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    loc = (payload.get("location_code") or payload.get("location") or "").strip()
    if not loc:
        raise HTTPException(status_code=400, detail="location_code required")

    sample = db.scalar(select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    sample.location = loc
    sample.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "location": sample.location}


@router.post("/samples/{sample_id}/quick-return")
def quick_return_sample(sample_id: str, payload: dict | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    sample = db.scalar(select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    active = db.scalar(select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None)))
    if active:
        active.returned_at = datetime.now(timezone.utc)

    # optional location update
    loc = None
    if payload:
        loc = (payload.get("location_code") or payload.get("location") or "").strip() or None
    if loc:
        sample.location = loc
        sample.updated_at = datetime.now(timezone.utc)

    db.commit()
    return {"ok": True, "returned": bool(active), "location": sample.location}
