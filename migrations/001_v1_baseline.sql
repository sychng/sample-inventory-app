BEGIN;

-- =========================
-- 1) Customers (dedupe)
-- =========================
CREATE TABLE IF NOT EXISTS public.customers (
  id         uuid PRIMARY KEY,
  name       text NOT NULL,
  name_norm  text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 2) Samples: add taxonomy + notes
--    (kept NULL for now to avoid breaking existing rows)
-- =========================
ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS division varchar(120),
  ADD COLUMN IF NOT EXISTS family   varchar(120),
  ADD COLUMN IF NOT EXISTS series   varchar(120),
  ADD COLUMN IF NOT EXISTS model    varchar(120),
  ADD COLUMN IF NOT EXISTS notes    text;

-- Helpful indexes for filtering/search
CREATE INDEX IF NOT EXISTS ix_samples_division ON public.samples (division);
CREATE INDEX IF NOT EXISTS ix_samples_family   ON public.samples (family);
CREATE INDEX IF NOT EXISTS ix_samples_series   ON public.samples (series);
CREATE INDEX IF NOT EXISTS ix_samples_model    ON public.samples (model);
CREATE INDEX IF NOT EXISTS ix_samples_location ON public.samples (location);

-- =========================
-- 3) Loans: add customer + loan_days + reminder tracking
-- =========================
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS loan_days int,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;

-- FK to customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='loans'
      AND constraint_name='loans_customer_id_fkey'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_loans_customer_id ON public.loans (customer_id);
CREATE INDEX IF NOT EXISTS ix_loans_due_at      ON public.loans (due_at);
CREATE INDEX IF NOT EXISTS ix_loans_returned_at ON public.loans (returned_at);

-- =========================
-- 4) Audit events
-- =========================
CREATE TABLE IF NOT EXISTS public.audit_events (
  id             uuid PRIMARY KEY,
  ts             timestamptz NOT NULL DEFAULT now(),
  actor_user_id  uuid,
  event_type     varchar(40) NOT NULL,
  sample_id      uuid,
  loan_id        uuid,
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- FKs (soft, set null on delete so history remains)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='audit_events'
      AND constraint_name='audit_events_actor_user_id_fkey'
  ) THEN
    ALTER TABLE public.audit_events
      ADD CONSTRAINT audit_events_actor_user_id_fkey
      FOREIGN KEY (actor_user_id) REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='audit_events'
      AND constraint_name='audit_events_sample_id_fkey'
  ) THEN
    ALTER TABLE public.audit_events
      ADD CONSTRAINT audit_events_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.samples(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='audit_events'
      AND constraint_name='audit_events_loan_id_fkey'
  ) THEN
    ALTER TABLE public.audit_events
      ADD CONSTRAINT audit_events_loan_id_fkey
      FOREIGN KEY (loan_id) REFERENCES public.loans(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_audit_events_ts         ON public.audit_events (ts);
CREATE INDEX IF NOT EXISTS ix_audit_events_event_type ON public.audit_events (event_type);
CREATE INDEX IF NOT EXISTS ix_audit_events_actor      ON public.audit_events (actor_user_id);
CREATE INDEX IF NOT EXISTS ix_audit_events_sample     ON public.audit_events (sample_id);
CREATE INDEX IF NOT EXISTS ix_audit_events_loan       ON public.audit_events (loan_id);

-- =========================
-- 5) App settings (global config like reminders)
-- =========================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key                 varchar(100) PRIMARY KEY,
  value               jsonb NOT NULL,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id  uuid
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='app_settings'
      AND constraint_name='app_settings_updated_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_updated_by_user_id_fkey
      FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_app_settings_updated_at ON public.app_settings (updated_at);

COMMIT;
