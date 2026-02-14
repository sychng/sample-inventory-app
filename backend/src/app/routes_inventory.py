import re
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.app.db import get_db
from src.app.deps import get_current_user
from src.app.models_auth import User
from src.app.models_inventory import Sample, Loan, Customer, AuditEvent

router = APIRouter(tags=["inventory"])


# =========================
# Request bodies (Step 2)
# =========================
class MoveIn(BaseModel):
    location_code: str


class QuickReturnIn(BaseModel):
    location_code: str | None = None


# =========================
# Customers
# =========================
@router.get("/customers")
def list_customers(q: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = (q or "").strip()
    if not q:
        return []
    like = f"%{q}%"
    rows = db.scalars(
        select(Customer).where(Customer.name.ilike(like)).order_by(Customer.name.asc()).limit(10)
    ).all()
    return [{"id": str(c.id), "name": c.name} for c in rows]


def _norm_customer_name(name: str) -> str:
    s = (name or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _get_or_create_customer(db: Session, customer_name: str) -> Customer | None:
    customer_name = (customer_name or "").strip()
    if not customer_name:
        return None

    norm = _norm_customer_name(customer_name)
    c = db.scalar(select(Customer).where(Customer.name_norm == norm))
    if c:
        return c

    c = Customer(name=customer_name, name_norm=norm)
    db.add(c)
    db.flush()
    return c


def _audit(db: Session, *, user_id, event_type: str, sample_id=None, loan_id=None, meta: dict | None = None):
    ev = AuditEvent(
        actor_user_id=user_id,
        event_type=event_type,
        sample_id=sample_id,
        loan_id=loan_id,
        meta=meta or {},
    )
    db.add(ev)


# =========================
# Samples
# =========================
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


# =========================
# Step 2: Move sample
# =========================
@router.post("/samples/{sample_id}/move")
def move_sample(sample_id: str, payload: MoveIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    new_loc = (payload.location_code or "").strip()
    if not new_loc:
        raise HTTPException(status_code=400, detail="location_code required")

    sample = db.scalar(select(Sample).where(Sample.id == sample_id, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    old_loc = sample.location
    sample.location = new_loc

    _audit(
        db,
        user_id=user.id,
        event_type="MOVED",
        sample_id=sample.id,
        loan_id=None,
        meta={"from": old_loc, "to": new_loc},
    )

    db.commit()
    return {"ok": True, "from": old_loc, "to": new_loc}


# =========================
# Loans
# =========================
@router.post("/loans")
def loan_sample(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sample_id = payload.get("sample_id")
    if not sample_id:
        raise HTTPException(status_code=400, detail="sample_id required")

    sample = db.scalar(select(Sample).where(Sample.id == sample_id, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    active = db.scalar(select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None)))
    if active:
        raise HTTPException(status_code=409, detail="sample already on loan")

    customer_name = payload.get("customer_name")
    remarks = payload.get("remarks")

    loan_days = payload.get("loan_days")
    due_at = None

    if loan_days is not None:
        try:
            loan_days = int(loan_days)
        except Exception:
            raise HTTPException(status_code=400, detail="loan_days must be an integer")
        if loan_days <= 0 or loan_days > 3650:
            raise HTTPException(status_code=400, detail="loan_days out of range")
        due_at = datetime.now(timezone.utc) + timedelta(days=loan_days)
    else:
        due_at = payload.get("due_at")  # backward compatibility

    cust = _get_or_create_customer(db, customer_name) if customer_name else None

    loan = Loan(
        sample_id=sample.id,
        borrower_user_id=user.id,
        out_at=datetime.now(timezone.utc),
        due_at=due_at,
        remarks=remarks,
        customer_id=(cust.id if cust else None),
        loan_days=loan_days,
    )
    db.add(loan)
    db.flush()

    _audit(
        db,
        user_id=user.id,
        event_type="LOANED",
        sample_id=sample.id,
        loan_id=loan.id,
        meta={
            "customer_name": customer_name,
            "loan_days": loan_days,
            "due_at": (due_at.isoformat() if isinstance(due_at, datetime) else None),
        },
    )

    db.commit()
    return {"loan_id": str(loan.id)}


@router.post("/loans/{loan_id}/return")
def return_loan(loan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    loan = db.scalar(select(Loan).where(Loan.id == loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="loan not found")
    if loan.returned_at:
        return {"ok": True}

    # rule: only borrower or admin can return
    if loan.borrower_user_id != user.id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="not allowed")

    loan.returned_at = datetime.now(timezone.utc)

    _audit(
        db,
        user_id=user.id,
        event_type="RETURNED",
        sample_id=loan.sample_id,
        loan_id=loan.id,
        meta={"method": "return_endpoint"},
    )

    db.commit()
    return {"ok": True}


@router.get("/scan/{code}")
def resolve_scan(code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    code = (code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code required")

    # Heuristic: sample SKUs start with SG (adjust if needed)
    is_sample_like = code.upper().startswith("SG")

    if is_sample_like:
        s = db.scalar(select(Sample).where(Sample.sku == code, Sample.is_active.is_(True)))
        if not s:
            raise HTTPException(status_code=404, detail="sample not found")

        active = db.scalar(select(Loan).where(Loan.sample_id == s.id, Loan.returned_at.is_(None)))
        customer_name = None
        if active and active.customer_id:
            c = db.scalar(select(Customer).where(Customer.id == active.customer_id))
            customer_name = c.name if c else None

        return {
            "type": "sample",
            "sample": {
                "id": str(s.id),
                "sku": s.sku,
                "name": s.name,
                "location": s.location,
            },
            "active_loan": (
                {
                    "loan_id": str(active.id),
                    "due_at": active.due_at,
                    "customer_name": customer_name,
                }
                if active
                else None
            ),
        }

    # Otherwise treat as location code
    # (Later we can validate format like LAB-*-* if you want)
    return {"type": "location", "location_code": code}



# =========================
# Step 2: Quick return by sample_id (+ optional move)
# =========================
@router.post("/samples/{sample_id}/quick-return")
def quick_return_sample(sample_id: str, payload: QuickReturnIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sample = db.scalar(select(Sample).where(Sample.id == sample_id, Sample.is_active.is_(True)))
    if not sample:
        raise HTTPException(status_code=404, detail="sample not found")

    # Find active loan for this sample
    loan = db.scalar(select(Loan).where(Loan.sample_id == sample.id, Loan.returned_at.is_(None)))

    # optional: if no active loan, still allow move
    if not loan:
        if payload.location_code:
            new_loc = payload.location_code.strip()
            if new_loc:
                old_loc = sample.location
                sample.location = new_loc
                _audit(
                    db,
                    user_id=user.id,
                    event_type="MOVED",
                    sample_id=sample.id,
                    loan_id=None,
                    meta={"from": old_loc, "to": new_loc, "method": "quick_return_no_loan"},
                )
                db.commit()
                return {"ok": True, "returned": False, "moved": True, "from": old_loc, "to": new_loc}
        return {"ok": True, "returned": False}

    # QUICK RETURN policy:
    # - industrial UX: allow any logged-in user to quick-return (default)
    # If you want strict borrower/admin, uncomment below:
    #
    # if loan.borrower_user_id != user.id and user.role != "ADMIN":
    #     raise HTTPException(status_code=403, detail="not allowed")

    loan.returned_at = datetime.now(timezone.utc)

    _audit(
        db,
        user_id=user.id,
        event_type="RETURNED",
        sample_id=sample.id,
        loan_id=loan.id,
        meta={"method": "quick_return"},
    )

    moved = False
    old_loc = None
    new_loc = None

    if payload.location_code:
        new_loc = payload.location_code.strip()
        if new_loc:
            old_loc = sample.location
            sample.location = new_loc
            moved = True
            _audit(
                db,
                user_id=user.id,
                event_type="MOVED",
                sample_id=sample.id,
                loan_id=loan.id,
                meta={"from": old_loc, "to": new_loc, "method": "quick_return"},
            )

    db.commit()
    return {"ok": True, "returned": True, "loan_id": str(loan.id), "moved": moved, "from": old_loc, "to": new_loc}
