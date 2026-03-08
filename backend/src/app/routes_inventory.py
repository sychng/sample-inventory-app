import re
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.app.db import get_db
from src.app.deps import get_current_user
from src.app.models_auth import User
from src.app.models_inventory import Sample, Loan, Customer

router = APIRouter(tags=["inventory"])


def normalize_customer_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def get_or_create_customer(db: Session, customer_name: str) -> Customer:
    cleaned = (customer_name or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="customer_name required")

    norm = normalize_customer_name(cleaned)

    existing = db.scalar(select(Customer).where(Customer.name_norm == norm))
    if existing:
        return existing

    customer = Customer(
        name=cleaned,
        name_norm=norm,
    )
    db.add(customer)
    db.flush()
    return customer


@router.post("/samples")
def create_sample(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
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
def list_samples(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Sample).where(Sample.is_active.is_(True)).order_by(Sample.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            (Sample.sku.ilike(like))
            | (Sample.name.ilike(like))
            | (Sample.lot_id.ilike(like))
        )

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
def loan_sample(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sample_id = payload.get("sample_id")
    if not sample_id:
        raise HTTPException(status_code=400, detail="sample_id required")

    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    sample = db.scalar(
        select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True))
    )
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    active = db.scalar(
        select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None))
    )
    if active:
        raise HTTPException(status_code=409, detail="sample already on loan")

    customer = None
    customer_id = payload.get("customer_id")
    customer_name = (payload.get("customer_name") or "").strip()

    if customer_id:
        try:
            customer_uuid = UUID(str(customer_id))
        except Exception:
            raise HTTPException(status_code=400, detail="invalid customer_id")

        customer = db.scalar(select(Customer).where(Customer.id == customer_uuid))
        if not customer:
            raise HTTPException(status_code=404, detail="customer not found")
    elif customer_name:
        customer = get_or_create_customer(db, customer_name)
    else:
        raise HTTPException(status_code=400, detail="customer_id or customer_name required")

    loan_days_raw = payload.get("loan_days", 14)
    try:
        loan_days = int(loan_days_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="loan_days must be an integer")

    if loan_days < 1 or loan_days > 365:
        raise HTTPException(status_code=400, detail="loan_days must be between 1 and 365")

    now = datetime.now(timezone.utc)
    due_at = now + timedelta(days=loan_days)

    loan = Loan(
        sample_id=sample.id,
        borrower_user_id=user.id,
        customer_id=customer.id,
        loan_days=loan_days,
        due_at=due_at,
        remarks=payload.get("remarks"),
        out_at=now,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)

    return {
        "loan_id": str(loan.id),
        "sample_id": str(sample.id),
        "customer_id": str(customer.id),
        "customer_name": customer.name,
        "loan_days": loan.loan_days,
        "due_at": loan.due_at,
    }


@router.post("/loans/{loan_id}/return")
def return_loan(
    loan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        loan_uuid = UUID(str(loan_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid loan_id")

    loan = db.scalar(select(Loan).where(Loan.id == loan_uuid))
    if not loan:
        raise HTTPException(status_code=404, detail="loan not found")

    if loan.returned_at:
        return {"ok": True}

    if loan.borrower_user_id != user.id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="not allowed")

    loan.returned_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/scan/{code}")
def scan_resolver(
    code: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    code = (code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code required")

    sample = None

    try:
        code_uuid = UUID(code)
        sample = db.scalar(
            select(Sample).where(Sample.id == code_uuid, Sample.is_active.is_(True))
        )
    except Exception:
        sample = None

    if sample is None:
        sample = db.scalar(
            select(Sample).where(Sample.sku == code, Sample.is_active.is_(True))
        )

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
                "location_code": sample.location,
                "is_loaned": bool(active_loan),
            },
        }

    return {"kind": "location", "location_code": code}


@router.post("/samples/{sample_id}/move")
def move_sample(
    sample_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    loc = (payload.get("location_code") or payload.get("location") or "").strip()
    if not loc:
        raise HTTPException(status_code=400, detail="location_code required")

    sample = db.scalar(
        select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True))
    )
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    sample.location = loc
    sample.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "location": sample.location}


@router.post("/samples/{sample_id}/quick-return")
def quick_return_sample(
    sample_id: str,
    payload: dict | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        sample_uuid = UUID(str(sample_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid sample_id")

    sample = db.scalar(
        select(Sample).where(Sample.id == sample_uuid, Sample.is_active.is_(True))
    )
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    active = db.scalar(
        select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None))
    )
    if active:
        active.returned_at = datetime.now(timezone.utc)

    loc = None
    if payload:
        loc = (payload.get("location_code") or payload.get("location") or "").strip() or None

    if loc:
        sample.location = loc
        sample.updated_at = datetime.now(timezone.utc)

    db.commit()
    return {"ok": True, "returned": bool(active), "location": sample.location}