-- ============================================================
-- TLC Landscape — Initial Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- ============================================================

-- -------------------------------------------------------
-- PROFILES (extends auth.users)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- CUSTOMERS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  monthly_rate    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_rate >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- TASK TYPES (billing rates)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  hourly_rate   NUMERIC(10,2) NOT NULL CHECK (hourly_rate > 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- INVOICES (declared before time_entries for FK)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id              UUID NOT NULL REFERENCES public.customers(id),
  billing_period_start     DATE NOT NULL,
  billing_period_end       DATE NOT NULL,
  monthly_rate_charged     NUMERIC(10,2) NOT NULL,
  subtotal_hourly          NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal_materials       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                    NUMERIC(10,2) NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  share_token              UUID NOT NULL DEFAULT gen_random_uuid(),
  pdf_url                  TEXT,
  sent_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_share_token UNIQUE (share_token)
);

-- -------------------------------------------------------
-- TIME ENTRIES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.profiles(id),
  customer_id     UUID NOT NULL REFERENCES public.customers(id),
  task_type_id    UUID NOT NULL REFERENCES public.task_types(id),
  hours           NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  worked_date     DATE NOT NULL,
  notes           TEXT,
  invoice_id      UUID REFERENCES public.invoices(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- VENDOR INVOICES (material costs / pass-through billing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.customers(id),
  vendor_name     TEXT NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  invoice_date    DATE NOT NULL,
  receipt_url     TEXT,
  invoice_id      UUID REFERENCES public.invoices(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- INVOICE LINE ITEMS (denormalized — rates frozen at billing time)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_type       TEXT NOT NULL CHECK (line_type IN ('flat_rate', 'hourly', 'material')),
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2),
  unit_rate       NUMERIC(10,2),
  amount          NUMERIC(10,2) NOT NULL,
  source_id       UUID
);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------

-- Helper: check if current user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner sees all profiles" ON public.profiles
  FOR SELECT USING (public.is_owner());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access to customers" ON public.customers
  FOR ALL USING (public.is_owner());
CREATE POLICY "Employees read active customers" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- TASK TYPES
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access to task_types" ON public.task_types
  FOR ALL USING (public.is_owner());
CREATE POLICY "Employees read active task_types" ON public.task_types
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- TIME ENTRIES
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own time_entries" ON public.time_entries
  FOR ALL USING (auth.uid() = employee_id);
CREATE POLICY "Owner full access to time_entries" ON public.time_entries
  FOR ALL USING (public.is_owner());

-- VENDOR INVOICES
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only on vendor_invoices" ON public.vendor_invoices
  FOR ALL USING (public.is_owner());

-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only on invoices" ON public.invoices
  FOR ALL USING (public.is_owner());

-- INVOICE LINE ITEMS
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only on invoice_line_items" ON public.invoice_line_items
  FOR ALL USING (public.is_owner());

-- -------------------------------------------------------
-- SEED: Default task types (Jeff can edit rates in-app)
-- -------------------------------------------------------
INSERT INTO public.task_types (name, hourly_rate) VALUES
  ('Mowing',    45.00),
  ('Edging',    40.00),
  ('Trimming',  45.00),
  ('Hauling',   55.00),
  ('Planting',  50.00),
  ('Cleanup',   40.00),
  ('Irrigation',60.00)
ON CONFLICT DO NOTHING;
