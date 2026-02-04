import { api } from "./client";

/**
 * IMPORTANT:
 * Your backend OpenAPI shows auth routes are /auth/* (rewritten from /api/auth/* via Vite proxy).
 * We still call /api/* in frontend for production consistency.
 *
 * Now we need the REAL inventory/loan paths.
 * If these don't match your backend, change ONLY the PATHS below.
 */

export type Sample = {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  lot_id?: string | null;
  location?: string | null;

  // These fields depend on your backend response. If not present, we’ll still render.
  is_loaned?: boolean;
  current_loan_id?: string | null;
  is_loaned_by_me?: boolean;
};

export type Loan = {
  id: string;
  sample_id: string;
  sample_name?: string;
  borrowed_at: string;
  returned_at?: string | null;
};

// ---- EDIT THESE PATHS IF NEEDED ----
const PATHS = {
  listSamples: "/api/samples",
  createLoan: "/api/loans",
  returnLoan: (loanId: string) => `/api/loans/${loanId}/return`,
};

// ------------------------------------

export const endpoints = {
  listSamples: (q: string) =>
    api.get<Sample[]>(`${PATHS.listSamples}?q=${encodeURIComponent(q)}`),

  createLoan: (sample_id: string) =>
    api.post<Loan>(PATHS.createLoan, { sample_id }),

  returnLoan: (loan_id: string) =>
    api.post<{ ok: true }>(PATHS.returnLoan(loan_id)),
};

