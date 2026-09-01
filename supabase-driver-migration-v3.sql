-- ============================================================================
-- KOVAI DAIRY APP - SUPABASE DATABASE MIGRATION V3
-- Multi-Role Authentication, Driver Data Isolation, & Secure RPC Functions
-- ============================================================================

-- 1. UTILITY TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. USER ROLES TABLE & STRICT AUTHORIZATION FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Strict is_admin function: Checks auth.uid(), returns TRUE ONLY for explicit 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Strict is_driver function: Checks auth.uid(), returns TRUE ONLY for explicit 'driver' role
CREATE OR REPLACE FUNCTION public.is_driver(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'driver'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. EXTEND STORES TABLE (ADDITIVE EXTENSIONS ONLY)
-- ----------------------------------------------------------------------------
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS driver_notes TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- ----------------------------------------------------------------------------
-- 4. ISOLATED DRIVER DELIVERY SCHEMA
-- ----------------------------------------------------------------------------

-- A. Delivery Runs
CREATE TABLE IF NOT EXISTS public.delivery_runs (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    run_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_delivery_runs_driver_id ON public.delivery_runs(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_date ON public.delivery_runs(date);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_owner_id ON public.delivery_runs(owner_id);

DROP TRIGGER IF EXISTS update_delivery_runs_updated_at ON public.delivery_runs;
CREATE TRIGGER update_delivery_runs_updated_at BEFORE UPDATE ON public.delivery_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- B. Delivery Stops
CREATE TABLE IF NOT EXISTS public.delivery_stops (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES public.delivery_runs(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    sequence INTEGER NOT NULL DEFAULT 1,
    sequence_number INTEGER DEFAULT 1,
    store_name TEXT NOT NULL,
    address TEXT,
    location TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    contact_person TEXT,
    phone TEXT,
    driver_notes TEXT,
    google_maps_url TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered', 'Skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_stops ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_delivery_stops_run_id ON public.delivery_stops(run_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_store_id ON public.delivery_stops(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_status ON public.delivery_stops(status);

DROP TRIGGER IF EXISTS update_delivery_stops_updated_at ON public.delivery_stops;
CREATE TRIGGER update_delivery_stops_updated_at BEFORE UPDATE ON public.delivery_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- C. Delivery Stop Items (ZERO PRICES / FINANCIAL FIELDS)
CREATE TABLE IF NOT EXISTS public.delivery_stop_items (
    id TEXT PRIMARY KEY,
    stop_id TEXT NOT NULL REFERENCES public.delivery_stops(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Unit',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_stop_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_delivery_stop_items_stop_id ON public.delivery_stop_items(stop_id);

-- ----------------------------------------------------------------------------
-- 5. SECURE RPC STATUS FUNCTIONS (NO DIRECT DRIVER UPDATE ALLOWED)
-- ----------------------------------------------------------------------------

-- Function: Driver marks assigned stop as Delivered
CREATE OR REPLACE FUNCTION public.mark_my_stop_delivered(p_stop_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_driver_id UUID;
    v_stop_exists BOOLEAN;
BEGIN
    -- 1. Must be authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Must have driver or admin role
    IF NOT (public.is_driver(auth.uid()) OR public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access denied: User does not have driver or admin role';
    END IF;

    -- 3. Verify stop exists and check assigned driver
    SELECT EXISTS(SELECT 1 FROM public.delivery_stops WHERE id = p_stop_id) INTO v_stop_exists;
    IF NOT v_stop_exists THEN
        RAISE EXCEPTION 'Delivery stop % does not exist', p_stop_id;
    END IF;

    SELECT dr.driver_id INTO v_driver_id
    FROM public.delivery_stops ds
    JOIN public.delivery_runs dr ON dr.id = ds.run_id
    WHERE ds.id = p_stop_id;

    -- 4. Verify assigned driver matches authenticated user
    IF v_driver_id IS NULL OR (v_driver_id != auth.uid() AND NOT public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access denied: You are not the assigned driver for this delivery stop';
    END IF;

    -- 5. Update ONLY status and timestamp
    UPDATE public.delivery_stops
    SET status = 'Delivered',
        updated_at = NOW()
    WHERE id = p_stop_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Driver marks assigned stop as Pending
CREATE OR REPLACE FUNCTION public.mark_my_stop_pending(p_stop_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_driver_id UUID;
    v_stop_exists BOOLEAN;
BEGIN
    -- 1. Must be authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Must have driver or admin role
    IF NOT (public.is_driver(auth.uid()) OR public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access denied: User does not have driver or admin role';
    END IF;

    -- 3. Verify stop exists and check assigned driver
    SELECT EXISTS(SELECT 1 FROM public.delivery_stops WHERE id = p_stop_id) INTO v_stop_exists;
    IF NOT v_stop_exists THEN
        RAISE EXCEPTION 'Delivery stop % does not exist', p_stop_id;
    END IF;

    SELECT dr.driver_id INTO v_driver_id
    FROM public.delivery_stops ds
    JOIN public.delivery_runs dr ON dr.id = ds.run_id
    WHERE ds.id = p_stop_id;

    -- 4. Verify assigned driver matches authenticated user
    IF v_driver_id IS NULL OR (v_driver_id != auth.uid() AND NOT public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access denied: You are not the assigned driver for this delivery stop';
    END IF;

    -- 5. Update ONLY status and timestamp
    UPDATE public.delivery_stops
    SET status = 'Pending',
        updated_at = NOW()
    WHERE id = p_stop_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicit Execution Privileges
REVOKE EXECUTE ON FUNCTION public.mark_my_stop_delivered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_my_stop_delivered(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_my_stop_pending(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_my_stop_pending(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RLS POLICIES FOR DELIVERY TABLES
-- ----------------------------------------------------------------------------

-- Delivery Runs RLS
DROP POLICY IF EXISTS "Admins can manage delivery_runs" ON public.delivery_runs;
DROP POLICY IF EXISTS "Drivers can select assigned delivery_runs" ON public.delivery_runs;

CREATE POLICY "Admins can manage delivery_runs" ON public.delivery_runs
    FOR ALL USING (public.is_admin());

CREATE POLICY "Drivers can select assigned delivery_runs" ON public.delivery_runs
    FOR SELECT USING (auth.uid() = driver_id);

-- Delivery Stops RLS (NOTE: NO DIRECT UPDATE PERMISSION FOR DRIVERS!)
DROP POLICY IF EXISTS "Admins can manage delivery_stops" ON public.delivery_stops;
DROP POLICY IF EXISTS "Drivers can select assigned delivery_stops" ON public.delivery_stops;

CREATE POLICY "Admins can manage delivery_stops" ON public.delivery_stops
    FOR ALL USING (public.is_admin());

CREATE POLICY "Drivers can select assigned delivery_stops" ON public.delivery_stops
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.delivery_runs dr
            WHERE dr.id = delivery_stops.run_id AND dr.driver_id = auth.uid()
        )
    );

-- Delivery Stop Items RLS
DROP POLICY IF EXISTS "Admins can manage delivery_stop_items" ON public.delivery_stop_items;
DROP POLICY IF EXISTS "Drivers can select assigned delivery_stop_items" ON public.delivery_stop_items;

CREATE POLICY "Admins can manage delivery_stop_items" ON public.delivery_stop_items
    FOR ALL USING (public.is_admin());

CREATE POLICY "Drivers can select assigned delivery_stop_items" ON public.delivery_stop_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.delivery_stops ds
            JOIN public.delivery_runs dr ON dr.id = ds.run_id
            WHERE ds.id = delivery_stop_items.stop_id AND dr.driver_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 7. STRICT ADMIN-ONLY ISOLATION ON MASTER BUSINESS & FINANCIAL TABLES
-- ----------------------------------------------------------------------------

-- STORES (Admin Only)
DROP POLICY IF EXISTS "Users can select their own stores" ON public.stores;
DROP POLICY IF EXISTS "Admins manage own stores" ON public.stores;
CREATE POLICY "Admins manage own stores" ON public.stores
    FOR ALL USING (public.is_admin());

-- PRODUCTS (Admin Only)
DROP POLICY IF EXISTS "Users can select their own products" ON public.products;
DROP POLICY IF EXISTS "Admins manage own products" ON public.products;
CREATE POLICY "Admins manage own products" ON public.products
    FOR ALL USING (public.is_admin());

-- DAILY REQUIREMENTS (Admin Only)
DROP POLICY IF EXISTS "Users can select their own daily_requirements" ON public.daily_requirements;
DROP POLICY IF EXISTS "Admins manage own daily_requirements" ON public.daily_requirements;
CREATE POLICY "Admins manage own daily_requirements" ON public.daily_requirements
    FOR ALL USING (public.is_admin());

-- INVOICES (Admin Only)
DROP POLICY IF EXISTS "Users can select their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins manage own invoices" ON public.invoices;
CREATE POLICY "Admins manage own invoices" ON public.invoices
    FOR ALL USING (public.is_admin());

-- PAYMENTS (Admin Only)
DROP POLICY IF EXISTS "Users can select their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins manage own payments" ON public.payments;
CREATE POLICY "Admins manage own payments" ON public.payments
    FOR ALL USING (public.is_admin());

-- PURCHASE ORDERS (Admin Only)
DROP POLICY IF EXISTS "Users can select their own purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins manage own purchase_orders" ON public.purchase_orders;
CREATE POLICY "Admins manage own purchase_orders" ON public.purchase_orders
    FOR ALL USING (public.is_admin());
