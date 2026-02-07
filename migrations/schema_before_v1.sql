--
-- PostgreSQL database dump
--

\restrict yGyp1zqqyp1LRiLm8Zcet2CcRyu0d3KMacW7L3PBK1HZAsbbNiycCXCM61p8fs3

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: appuser
--

CREATE SCHEMA app;


ALTER SCHEMA app OWNER TO appuser;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: doc_type; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.doc_type AS ENUM (
    'LOAN_FORM'
);


ALTER TYPE app.doc_type OWNER TO appuser;

--
-- Name: loan_status; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.loan_status AS ENUM (
    'OPEN',
    'PARTIAL_RETURNED',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE app.loan_status OWNER TO appuser;

--
-- Name: loan_target_type; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.loan_target_type AS ENUM (
    'CUSTOMER',
    'STAFF',
    'ENTITY'
);


ALTER TYPE app.loan_target_type OWNER TO appuser;

--
-- Name: location_type; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.location_type AS ENUM (
    'PHYSICAL',
    'SHOWROOM',
    'STORAGE'
);


ALTER TYPE app.location_type OWNER TO appuser;

--
-- Name: reminder_type; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.reminder_type AS ENUM (
    'DUE_DATE'
);


ALTER TYPE app.reminder_type OWNER TO appuser;

--
-- Name: sample_event_type; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.sample_event_type AS ENUM (
    'SAMPLE_REGISTERED',
    'LOCATION_ASSIGNED',
    'LOANED_OUT',
    'RETURN_VERIFIED',
    'RETURN_QUICK_ADMIN',
    'TRANSFERRED',
    'STATUS_CHANGED',
    'NOTE_ADDED'
);


ALTER TYPE app.sample_event_type OWNER TO appuser;

--
-- Name: sample_status; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.sample_status AS ENUM (
    'IN_OFFICE',
    'ON_LOAN',
    'IN_REPAIR',
    'RETIRED'
);


ALTER TYPE app.sample_status OWNER TO appuser;

--
-- Name: send_status; Type: TYPE; Schema: app; Owner: appuser
--

CREATE TYPE app.send_status AS ENUM (
    'SENT',
    'FAILED'
);


ALTER TYPE app.send_status OWNER TO appuser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.app_settings OWNER TO appuser;

--
-- Name: customers; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    contact_name text,
    contact_email text,
    contact_phone text,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.customers OWNER TO appuser;

--
-- Name: entities; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.entities OWNER TO appuser;

--
-- Name: loan_documents; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.loan_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    doc_type app.doc_type DEFAULT 'LOAN_FORM'::app.doc_type NOT NULL,
    file_key text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    emailed_to text,
    emailed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.loan_documents OWNER TO appuser;

--
-- Name: loan_items; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.loan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    sample_id uuid NOT NULL,
    returned_at timestamp with time zone,
    returned_location_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.loan_items OWNER TO appuser;

--
-- Name: loan_orders; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.loan_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_no text NOT NULL,
    loan_to_type app.loan_target_type NOT NULL,
    loan_to_id uuid NOT NULL,
    responsible_staff_id uuid NOT NULL,
    processed_by_staff_id uuid NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    due_at timestamp with time zone,
    status app.loan_status DEFAULT 'OPEN'::app.loan_status NOT NULL,
    purpose text,
    purpose_notes text,
    borrower_contact_name text,
    borrower_contact_email text,
    borrower_contact_phone text,
    borrower_address text,
    generate_loan_form boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.loan_orders OWNER TO appuser;

--
-- Name: locations; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location_type app.location_type DEFAULT 'PHYSICAL'::app.location_type NOT NULL,
    qr_code_value text NOT NULL,
    parent_location_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.locations OWNER TO appuser;

--
-- Name: product_categories; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.product_categories OWNER TO appuser;

--
-- Name: product_series; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.product_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.product_series OWNER TO appuser;

--
-- Name: products; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    series_id uuid NOT NULL,
    model_code text NOT NULL,
    model_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    datasheet_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.products OWNER TO appuser;

--
-- Name: reminder_log; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.reminder_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_type app.reminder_type DEFAULT 'DUE_DATE'::app.reminder_type NOT NULL,
    responsible_staff_id uuid NOT NULL,
    sent_to_email text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    status app.send_status NOT NULL,
    error_message text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    sent_day date GENERATED ALWAYS AS (((sent_at AT TIME ZONE 'UTC'::text))::date) STORED
);


ALTER TABLE app.reminder_log OWNER TO appuser;

--
-- Name: sample_events; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.sample_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sample_id uuid NOT NULL,
    event_type app.sample_event_type NOT NULL,
    event_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_staff_id uuid,
    loan_id uuid,
    from_location_id uuid,
    to_location_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE app.sample_events OWNER TO appuser;

--
-- Name: samples; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.samples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_tag text NOT NULL,
    product_id uuid NOT NULL,
    serial_number text,
    lot_id text,
    version_revision text,
    status app.sample_status DEFAULT 'IN_OFFICE'::app.sample_status NOT NULL,
    current_location_id uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_sample_identifier CHECK ((NOT ((serial_number IS NULL) AND (lot_id IS NULL))))
);


ALTER TABLE app.samples OWNER TO appuser;

--
-- Name: staff; Type: TABLE; Schema: app; Owner: appuser
--

CREATE TABLE app.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_name text NOT NULL,
    email text NOT NULL,
    department text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.staff OWNER TO appuser;

--
-- Name: loans; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.loans (
    id uuid NOT NULL,
    sample_id uuid NOT NULL,
    borrower_user_id uuid NOT NULL,
    out_at timestamp with time zone DEFAULT now() NOT NULL,
    due_at timestamp with time zone,
    returned_at timestamp with time zone,
    remarks text
);


ALTER TABLE public.loans OWNER TO appuser;

--
-- Name: samples; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.samples (
    id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(120),
    lot_id character varying(120),
    location character varying(120),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.samples OWNER TO appuser;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    device_label character varying(120),
    last_seen_at timestamp with time zone,
    ip character varying(64),
    user_agent character varying(255)
);


ALTER TABLE public.sessions OWNER TO appuser;

--
-- Name: users; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO appuser;

--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: customers customers_company_name_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_company_name_key UNIQUE (company_name);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: entities entities_name_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.entities
    ADD CONSTRAINT entities_name_key UNIQUE (name);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: loan_documents loan_documents_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_documents
    ADD CONSTRAINT loan_documents_pkey PRIMARY KEY (id);


--
-- Name: loan_items loan_items_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_items
    ADD CONSTRAINT loan_items_pkey PRIMARY KEY (id);


--
-- Name: loan_orders loan_orders_loan_no_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_orders
    ADD CONSTRAINT loan_orders_loan_no_key UNIQUE (loan_no);


--
-- Name: loan_orders loan_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_orders
    ADD CONSTRAINT loan_orders_pkey PRIMARY KEY (id);


--
-- Name: locations locations_parent_location_id_name_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_parent_location_id_name_key UNIQUE (parent_location_id, name);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: locations locations_qr_code_value_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_qr_code_value_key UNIQUE (qr_code_value);


--
-- Name: product_categories product_categories_name_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.product_categories
    ADD CONSTRAINT product_categories_name_key UNIQUE (name);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_series product_series_category_id_name_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.product_series
    ADD CONSTRAINT product_series_category_id_name_key UNIQUE (category_id, name);


--
-- Name: product_series product_series_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.product_series
    ADD CONSTRAINT product_series_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_series_id_model_code_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.products
    ADD CONSTRAINT products_series_id_model_code_key UNIQUE (series_id, model_code);


--
-- Name: reminder_log reminder_log_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.reminder_log
    ADD CONSTRAINT reminder_log_pkey PRIMARY KEY (id);


--
-- Name: sample_events sample_events_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_pkey PRIMARY KEY (id);


--
-- Name: samples samples_asset_tag_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.samples
    ADD CONSTRAINT samples_asset_tag_key UNIQUE (asset_tag);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_loan_docs_loan; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_loan_docs_loan ON app.loan_documents USING btree (loan_id);


--
-- Name: idx_loan_items_loan; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_loan_items_loan ON app.loan_items USING btree (loan_id);


--
-- Name: idx_loan_items_sample; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_loan_items_sample ON app.loan_items USING btree (sample_id);


--
-- Name: idx_loan_orders_due; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_loan_orders_due ON app.loan_orders USING btree (due_at);


--
-- Name: idx_loan_orders_resp; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_loan_orders_resp ON app.loan_orders USING btree (responsible_staff_id);


--
-- Name: idx_locations_parent; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_locations_parent ON app.locations USING btree (parent_location_id);


--
-- Name: idx_products_model_code; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_products_model_code ON app.products USING btree (model_code);


--
-- Name: idx_products_model_name; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_products_model_name ON app.products USING gin (to_tsvector('simple'::regconfig, model_name));


--
-- Name: idx_sample_events_sample_time; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_sample_events_sample_time ON app.sample_events USING btree (sample_id, event_at DESC);


--
-- Name: idx_sample_events_type; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_sample_events_type ON app.sample_events USING btree (event_type);


--
-- Name: idx_samples_location; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_samples_location ON app.samples USING btree (current_location_id);


--
-- Name: idx_samples_lot; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_samples_lot ON app.samples USING btree (lot_id);


--
-- Name: idx_samples_product; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_samples_product ON app.samples USING btree (product_id);


--
-- Name: idx_samples_serial; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_samples_serial ON app.samples USING btree (serial_number);


--
-- Name: idx_samples_status; Type: INDEX; Schema: app; Owner: appuser
--

CREATE INDEX idx_samples_status ON app.samples USING btree (status);


--
-- Name: uq_due_date_once_per_staff_per_day; Type: INDEX; Schema: app; Owner: appuser
--

CREATE UNIQUE INDEX uq_due_date_once_per_staff_per_day ON app.reminder_log USING btree (responsible_staff_id, reminder_type, sent_day) WHERE (reminder_type = 'DUE_DATE'::app.reminder_type);


--
-- Name: uq_one_open_loan_per_sample; Type: INDEX; Schema: app; Owner: appuser
--

CREATE UNIQUE INDEX uq_one_open_loan_per_sample ON app.loan_items USING btree (sample_id) WHERE (returned_at IS NULL);


--
-- Name: uq_samples_product_serial; Type: INDEX; Schema: app; Owner: appuser
--

CREATE UNIQUE INDEX uq_samples_product_serial ON app.samples USING btree (product_id, serial_number) WHERE (serial_number IS NOT NULL);


--
-- Name: ix_loans_borrower_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX ix_loans_borrower_user_id ON public.loans USING btree (borrower_user_id);


--
-- Name: ix_loans_sample_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX ix_loans_sample_id ON public.loans USING btree (sample_id);


--
-- Name: ix_samples_sku; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX ix_samples_sku ON public.samples USING btree (sku);


--
-- Name: ix_sessions_token_hash; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX ix_sessions_token_hash ON public.sessions USING btree (token_hash);


--
-- Name: ix_sessions_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX ix_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: appuser
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: loan_documents loan_documents_loan_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_documents
    ADD CONSTRAINT loan_documents_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES app.loan_orders(id) ON DELETE CASCADE;


--
-- Name: loan_items loan_items_loan_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_items
    ADD CONSTRAINT loan_items_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES app.loan_orders(id) ON DELETE CASCADE;


--
-- Name: loan_items loan_items_returned_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_items
    ADD CONSTRAINT loan_items_returned_location_id_fkey FOREIGN KEY (returned_location_id) REFERENCES app.locations(id);


--
-- Name: loan_items loan_items_sample_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_items
    ADD CONSTRAINT loan_items_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES app.samples(id);


--
-- Name: loan_orders loan_orders_processed_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_orders
    ADD CONSTRAINT loan_orders_processed_by_staff_id_fkey FOREIGN KEY (processed_by_staff_id) REFERENCES app.staff(id);


--
-- Name: loan_orders loan_orders_responsible_staff_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.loan_orders
    ADD CONSTRAINT loan_orders_responsible_staff_id_fkey FOREIGN KEY (responsible_staff_id) REFERENCES app.staff(id);


--
-- Name: locations locations_parent_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.locations
    ADD CONSTRAINT locations_parent_location_id_fkey FOREIGN KEY (parent_location_id) REFERENCES app.locations(id);


--
-- Name: product_series product_series_category_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.product_series
    ADD CONSTRAINT product_series_category_id_fkey FOREIGN KEY (category_id) REFERENCES app.product_categories(id);


--
-- Name: products products_series_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.products
    ADD CONSTRAINT products_series_id_fkey FOREIGN KEY (series_id) REFERENCES app.product_series(id);


--
-- Name: reminder_log reminder_log_responsible_staff_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.reminder_log
    ADD CONSTRAINT reminder_log_responsible_staff_id_fkey FOREIGN KEY (responsible_staff_id) REFERENCES app.staff(id);


--
-- Name: sample_events sample_events_actor_staff_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES app.staff(id);


--
-- Name: sample_events sample_events_from_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_from_location_id_fkey FOREIGN KEY (from_location_id) REFERENCES app.locations(id);


--
-- Name: sample_events sample_events_loan_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES app.loan_orders(id);


--
-- Name: sample_events sample_events_sample_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES app.samples(id) ON DELETE CASCADE;


--
-- Name: sample_events sample_events_to_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.sample_events
    ADD CONSTRAINT sample_events_to_location_id_fkey FOREIGN KEY (to_location_id) REFERENCES app.locations(id);


--
-- Name: samples samples_current_location_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.samples
    ADD CONSTRAINT samples_current_location_id_fkey FOREIGN KEY (current_location_id) REFERENCES app.locations(id);


--
-- Name: samples samples_product_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: appuser
--

ALTER TABLE ONLY app.samples
    ADD CONSTRAINT samples_product_id_fkey FOREIGN KEY (product_id) REFERENCES app.products(id);


--
-- Name: loans loans_borrower_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_borrower_user_id_fkey FOREIGN KEY (borrower_user_id) REFERENCES public.users(id);


--
-- Name: loans loans_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict yGyp1zqqyp1LRiLm8Zcet2CcRyu0d3KMacW7L3PBK1HZAsbbNiycCXCM61p8fs3

