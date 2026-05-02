-- ============================================================
-- SCANMART: RLS Security Fix
-- Run this in Supabase → SQL Editor
-- Purpose: Prevent cross-account data leaks
-- ============================================================

-- ─── 1. STORES TABLE ───────────────────────────────────────
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop if exists (safe re-run)
DROP POLICY IF EXISTS "owner_sees_own_stores" ON stores;

-- Each user only sees/edits their own stores
CREATE POLICY "owner_sees_own_stores"
ON stores FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ─── 2. INVENTORY TABLE ────────────────────────────────────
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_owner_inventory" ON inventory;

CREATE POLICY "store_owner_inventory"
ON inventory FOR ALL
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- ─── 3. STAFF TABLE ────────────────────────────────────────
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_sees_own_staff" ON staff;

-- Owner sees their own staff; staff see their own row
CREATE POLICY "owner_sees_own_staff"
ON staff FOR ALL
USING (
  shop_id = auth.uid()
  OR id = auth.uid()
  OR store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id = auth.uid()
  OR store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- ─── 4. GRN TABLES ─────────────────────────────────────────
ALTER TABLE grn_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_grn_sessions" ON grn_sessions;
CREATE POLICY "owner_grn_sessions"
ON grn_sessions FOR ALL
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_grn_items" ON grn_items;
CREATE POLICY "owner_grn_items"
ON grn_items FOR ALL
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- ─── 5. SALES TABLE ────────────────────────────────────────
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_sees_own_sales" ON sales;
CREATE POLICY "owner_sees_own_sales"
ON sales FOR ALL
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- ─── 6. SUPPLIERS TABLE ────────────────────────────────────
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_sees_own_suppliers" ON suppliers;
CREATE POLICY "owner_sees_own_suppliers"
ON suppliers FOR ALL
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- ============================================================
-- DONE! All tables are now locked to their respective owners.
-- ============================================================
