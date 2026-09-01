-- ============================================================================
-- KOVAI DAIRY APP - SUPABASE SECURITY VERIFICATION SUITE (V3)
-- Execute these statements in Supabase SQL Editor to test RLS & RPC isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VERIFY ADMIN READ ACCESS ON ALL BUSINESS TABLES
-- ----------------------------------------------------------------------------
-- Expected Result for Admin: Full row counts returned
SELECT count(*) AS admin_products FROM public.products;
SELECT count(*) AS admin_invoices FROM public.invoices;
SELECT count(*) AS admin_payments FROM public.payments;
SELECT count(*) AS admin_stores FROM public.stores;
SELECT count(*) AS admin_requirements FROM public.daily_requirements;

-- ----------------------------------------------------------------------------
-- 2. VERIFY DRIVER ZERO-ROW READ ACCESS ON SENSITIVE MASTER TABLES
-- Replace '<DRIVER_USER_UUID>' with a valid driver auth user ID
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<DRIVER_USER_UUID>';

-- MUST RETURN 0 ROWS:
SELECT count(*) AS driver_products FROM public.products; -- Expected: 0
SELECT count(*) AS driver_invoices FROM public.invoices; -- Expected: 0
SELECT count(*) AS driver_payments FROM public.payments; -- Expected: 0
SELECT count(*) AS driver_stores FROM public.stores;     -- Expected: 0
SELECT count(*) AS driver_requirements FROM public.daily_requirements; -- Expected: 0

-- ----------------------------------------------------------------------------
-- 3. VERIFY DRIVER ASSIGNED DELIVERY READ ACCESS
-- ----------------------------------------------------------------------------
-- Driver should ONLY see their own assigned runs, stops, and stop items
SELECT * FROM public.delivery_runs;
SELECT * FROM public.delivery_stops;
SELECT * FROM public.delivery_stop_items;

-- ----------------------------------------------------------------------------
-- 4. VERIFY DIRECT DRIVER UPDATE IS DENIED
-- ----------------------------------------------------------------------------
-- Attempting direct UPDATE must fail with permission denied:
UPDATE public.delivery_stops SET store_name = 'Hacked Store' WHERE id = 'stop-1';
-- Expected Output: ERROR: permission denied for table delivery_stops

-- ----------------------------------------------------------------------------
-- 5. VERIFY RPC FUNCTION EXECUTABILITY & ISOLATION
-- ----------------------------------------------------------------------------
-- Driver marking their own stop delivered (Succeeds if stop-1 is assigned to this driver):
SELECT public.mark_my_stop_delivered('stop-1');

-- Driver marking another driver's stop delivered (Must Fail):
-- Expected Output: ERROR: Access denied: You are not the assigned driver for this delivery stop

-- ----------------------------------------------------------------------------
-- 6. VERIFY UNASSIGNED / PENDING USER ZERO-ROW ACCESS
-- Replace '<UNASSIGNED_USER_UUID>' with a user without a user_roles row
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<UNASSIGNED_USER_UUID>';

SELECT public.is_admin('<UNASSIGNED_USER_UUID>'); -- Expected: FALSE
SELECT count(*) FROM public.stores;               -- Expected: 0
SELECT count(*) FROM public.delivery_runs;        -- Expected: 0
