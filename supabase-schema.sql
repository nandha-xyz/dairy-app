-- ============================================================================
-- KOVAI DAIRY DISTRIBUTION APP - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Execute this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all required tables, Row Level Security (RLS) policies, indexes,
-- and updated_at trigger functions for user data isolation.
-- ============================================================================

-- 1. UTILITY TRIGGER FUNCTION FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. STORES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    contact_person TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active',
    address TEXT,
    recurring_requirements JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own stores" ON public.stores FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own stores" ON public.stores FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own stores" ON public.stores FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    selling_price NUMERIC DEFAULT 0,
    purchase_price NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own products" ON public.products FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. DAILY REQUIREMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_requirements (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    store_code TEXT,
    store_name TEXT,
    location TEXT,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Pending',
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    last_updated TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own daily_requirements" ON public.daily_requirements FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own daily_requirements" ON public.daily_requirements FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own daily_requirements" ON public.daily_requirements FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own daily_requirements" ON public.daily_requirements FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_daily_requirements_owner_id ON public.daily_requirements(owner_id);
CREATE INDEX IF NOT EXISTS idx_daily_requirements_date ON public.daily_requirements(date);
CREATE INDEX IF NOT EXISTS idx_daily_requirements_store ON public.daily_requirements(store_id);

DROP TRIGGER IF EXISTS update_daily_requirements_updated_at ON public.daily_requirements;
CREATE TRIGGER update_daily_requirements_updated_at BEFORE UPDATE ON public.daily_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. INVOICES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    requirement_id TEXT REFERENCES public.daily_requirements(id) ON DELETE SET NULL,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name TEXT,
    location TEXT,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    outstanding_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Generated',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own invoices" ON public.invoices FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_store ON public.invoices(store_id);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name TEXT,
    amount NUMERIC DEFAULT 0,
    date DATE NOT NULL,
    mode TEXT DEFAULT 'UPI',
    reference_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own payments" ON public.payments FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own payments" ON public.payments FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_store ON public.payments(store_id);

-- ----------------------------------------------------------------------------
-- 7. PURCHASE ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Draft',
    total_cost NUMERIC DEFAULT 0,
    confirmed_at TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own purchase_orders" ON public.purchase_orders FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own purchase_orders" ON public.purchase_orders FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own purchase_orders" ON public.purchase_orders FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner_id ON public.purchase_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(date);

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. PO BUFFERS TABLE (PO Settings per Product & Date)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.po_buffers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    buffer_key TEXT NOT NULL,
    buffer_qty NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, buffer_key)
);

ALTER TABLE public.po_buffers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own po_buffers" ON public.po_buffers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own po_buffers" ON public.po_buffers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own po_buffers" ON public.po_buffers FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own po_buffers" ON public.po_buffers FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_po_buffers_owner_id ON public.po_buffers(owner_id);

DROP TRIGGER IF EXISTS update_po_buffers_updated_at ON public.po_buffers;
CREATE TRIGGER update_po_buffers_updated_at BEFORE UPDATE ON public.po_buffers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
