-- ============================================================
-- ScanMart Partner — Supabase Schema Fixes
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
-- ⚠️  Read each section before running.
-- Run one section at a time to be safe.
-- ============================================================


-- ============================================================
-- SECTION 1: Atomic Stock Decrement Function (REQUIRED)
-- Sales/checkout page now calls this RPC.
-- Must be created BEFORE deploying the updated sales code.
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id uuid,
  p_quantity integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ✅ Security Fix: Verify product belongs to the calling user's store
  -- Prevents any authenticated user from decrementing another store's stock
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

  -- If no row was updated → insufficient stock
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$;

-- ✅ Only authenticated (logged-in) users can call this function
-- anon access removed — unauthenticated users cannot decrement stock
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon;


-- ============================================================
-- SECTION 2: Fix inventory.last_sold_at Default
-- New products currently get last_sold_at = now(), so they
-- never appear in dead stock reports until 90 days pass.
-- Fix: Set default to NULL.
-- ============================================================

ALTER TABLE public.inventory
  ALTER COLUMN last_sold_at SET DEFAULT NULL;

-- Optional: Clear last_sold_at for products that have never had a sale
-- (those where last_sold_at = created_at, meaning it was set on insert)
-- Uncomment carefully after reviewing affected rows:
-- UPDATE public.inventory
-- SET last_sold_at = NULL
-- WHERE last_sold_at IS NOT NULL
--   AND last_sold_at::date = created_at::date
--   AND id NOT IN (SELECT DISTINCT product_id FROM public.sale_items);


-- ============================================================
-- SECTION 3: Fix payment_requests.amount Type
-- Currently TEXT — should be NUMERIC for proper math.
-- ============================================================

ALTER TABLE public.payment_requests
  ALTER COLUMN amount TYPE numeric(10,2)
  USING REPLACE(amount, '₹', '')::numeric(10,2);


-- ============================================================
-- SECTION 4: Drop Dead Columns
-- ⚠️  Backup your data before running this section.
-- These columns are confirmed unused by the codebase.
-- ============================================================

-- staff table: pin_hash and pin_version are never read/written
ALTER TABLE public.staff DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE public.staff DROP COLUMN IF EXISTS pin_version;

-- sale_items table: price column is never read/written (price_at_sale is used)
ALTER TABLE public.sale_items DROP COLUMN IF EXISTS price;


-- ============================================================
-- SECTION 5: Row Level Security (RLS) Policies
-- ⚠️  CRITICAL for multi-tenant security.
-- Without these, any user with the anon key can read ALL data.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.suppliers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns                     ENABLE ROW LEVEL SECURITY;

-- ── Stores ─────────────────────────────────────────────────
-- Only the owner can see/edit their stores
CREATE POLICY "stores_owner_only" ON public.stores
  FOR ALL USING (owner_id = auth.uid());

-- ── Store Settings ──────────────────────────────────────────
-- id = auth.uid() already, simple policy
CREATE POLICY "store_settings_owner_only" ON public.store_settings
  FOR ALL USING (id = auth.uid());

-- ── Suppliers ──────────────────────────────────────────────
-- Suppliers are scoped to their owner
CREATE POLICY "suppliers_owner_only" ON public.suppliers
  FOR ALL USING (owner_id = auth.uid());

-- ── Inventory ──────────────────────────────────────────────
-- Inventory belongs to a store, which belongs to an owner
CREATE POLICY "inventory_by_owner_store" ON public.inventory
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Inventory Batches ───────────────────────────────────────
CREATE POLICY "batches_by_owner_store" ON public.inventory_batches
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Inventory Transfers ─────────────────────────────────────
-- Transfer visible if source or destination store belongs to owner
CREATE POLICY "transfers_by_owner" ON public.inventory_transfers
  FOR ALL USING (
    source_store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR
    dest_store_id   IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- ── Sales ───────────────────────────────────────────────────
CREATE POLICY "sales_by_owner_store" ON public.sales
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Sale Items ──────────────────────────────────────────────
-- Sale items inherit from sales (join through sale_id)
CREATE POLICY "sale_items_by_owner" ON public.sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM public.sales
      WHERE store_id IN (
        SELECT id FROM public.stores WHERE owner_id = auth.uid()
      )
    )
  );

-- ── Customers ──────────────────────────────────────────────
CREATE POLICY "customers_by_owner_store" ON public.customers
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Staff ───────────────────────────────────────────────────
-- ✅ Security Fix: Removed 'OR store_id IS NULL' — that clause allowed
-- all users to see each other's admin staff records (cross-account bug).
-- Fallback handled in frontend via shop_id = auth.uid() query.
DROP POLICY IF EXISTS "staff_by_owner_store" ON public.staff;
CREATE POLICY "staff_by_owner_store" ON public.staff
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
    -- Owner can always see their own admin record (even if store_id is NULL during setup)
    OR shop_id = auth.uid()
  );

-- ── Supplier Credit Transactions ────────────────────────────
CREATE POLICY "supplier_tx_by_owner_store" ON public.supplier_credit_transactions
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Payment Requests ────────────────────────────────────────
CREATE POLICY "payment_requests_by_store" ON public.payment_requests
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- ── Returns ─────────────────────────────────────────────────
CREATE POLICY "returns_by_owner" ON public.returns
  FOR ALL USING (
    original_sale_id IN (
      SELECT id FROM public.sales
      WHERE store_id IN (
        SELECT id FROM public.stores WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================================
-- DONE ✅
-- After running:
-- 1. Deploy updated sales/page.tsx and suppliers/page.tsx
-- 2. Test: login as Merchant A, check Merchant B's data is NOT visible
-- 3. Test: checkout flow works (decrement_stock RPC)
-- ============================================================
