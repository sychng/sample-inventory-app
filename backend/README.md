# Sample Inventory & Loan Tracking System

Internal web app to track loanable demo units (individual assets, not stock). Built for an MNC workflow:
- Fast scan-first loan/return (<10s)
- QR-based shelf accuracy (leaf-only locations)
- Clear accountability via Responsible person
- Optional branded Loan Form PDF with QR link
- Due-date reminder emails (non-spammy, logged)

## Tech Stack
- Backend: FastAPI (Python)
- DB: PostgreSQL 16
- Frontend: React + MUI (planned / in progress)
- QR scanning: mobile camera or USB scanner

## Quick Start (Backend)
See: `backend/README.md`

## Documentation
- `docs/01_architecture.md` – system design + flows
- `docs/02_database.md` – ERD + constraints
- `docs/03_api.md` – endpoint contracts

## Status
MVP in progress: DB schema + first loan/return smoke tests complete.
