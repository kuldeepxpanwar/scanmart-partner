-- ============================================================
-- ScanMart — Security Patch v2
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-04-26
-- ============================================================
-- Run ALL at once — safe to run multiple times (idempotent)
-- ============================================================


-- ============================================================
-- FIX 1: decrement_stock — Add owner check + remove anon access
-- Risk: Unauthenticated users could decrement any store's stock
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id uuid,
  p_quantity integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ✅ Security: Verify product belongs to the calling user's store
  IF NOT EXISTS (
    SELECT 1
    FROM public.inventory i
    JOIN public.stores s ON s.id = i.store_id
    WHERE i.id = p_product_id
      AND s.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: product does not belong to your store';
  END IF;

  UPDATE public.inventory
  SET
    stock        = stock - p_quantity,
    last_sold_at = now()
  WHERE id = p_product_id
    AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$;

-- ✅ Remove anon access — only logged-in users can call this
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon;


-- ============================================================
-- FIX 2: Staff RLS — Replace NULL bypass with shop_id check
-- Risk: OR store_id IS NULL allowed cross-account data access
-- ============================================================

DROP POLICY IF EXISTS "staff_by_owner_store" ON public.staff;

CREATE POLICY "staff_by_owner_store" ON public.staff
  FOR ALL USING (
    -- Staff linked to owner's stores
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
    -- OR owner's own admin record (shop_id = their auth.uid)
    -- Handles new accounts where store_id is still NULL during setup
    OR shop_id = auth.uid()
  );


-- ============================================================
-- VERIFY — Check both fixes applied correctly
-- ============================================================

-- Check staff policy (should show new policy without OR store_id IS NULL)
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'staff';

-- Check function (should show owner check inside)
SELECT prosrc
FROM pg_proc
WHERE proname = 'decrement_stock';

-- ============================================================
-- DONE ✅
-- ============================================================
