-- ============================================================
-- ScanMart — Inventory Table Verification + Data Migration
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-05-03
-- ============================================================
-- Run STEP 1 first to see what columns exist.
-- Then run STEP 2 only if columns are missing.
-- Then run STEP 3 to verify inventory data integrity.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: VERIFY — inventory table current columns
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory'
ORDER BY ordinal_position;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: ENSURE all required columns exist on inventory
--  Run only if STEP 1 shows them missing
-- ─────────────────────────────────────────────────────────────

-- strip_size: tablets per strip (10 for Tab/Cap, 1 for Syrup/Inj)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS strip_size integer NOT NULL DEFAULT 1;

-- pack_size: strips per box
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS pack_size integer NOT NULL DEFAULT 1;

-- sell_unit: how POS sells this item ('strip', 'tablet', 'piece', 'box')
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS sell_unit text NOT NULL DEFAULT 'piece';

-- ptr_per_strip: original invoice PTR per strip (reference only, not used in billing)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS ptr_per_strip numeric(10, 4);


-- ─────────────────────────────────────────────────────────────
-- STEP 3: VERIFY inventory_batches table
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_batches'
ORDER BY ordinal_position;

-- Ensure strip_size exists on batches too
ALTER TABLE public.inventory_batches
  ADD COLUMN IF NOT EXISTS strip_size integer NOT NULL DEFAULT 1;


-- ─────────────────────────────────────────────────────────────
-- STEP 4: AUTO-FIX strip_size on existing inventory items
--   For existing Tablet/Capsule/Pharmacy items that have
--   strip_size = 1 (wrong default), update to 10
--   (This is a safe assumption — user can edit per-product if different)
-- ─────────────────────────────────────────────────────────────
UPDATE public.inventory
SET
  strip_size = 10,
  sell_unit  = 'strip',
  pack_size  = CASE WHEN pack_size < 1 THEN 1 ELSE pack_size END
WHERE
  strip_size = 1          -- hasn't been set yet
  AND category IN ('Tablet', 'Capsule', 'Pharmacy');

-- For Sachet: strip_size = 10, sell as strip
UPDATE public.inventory
SET
  strip_size = 10,
  sell_unit  = 'strip'
WHERE
  strip_size = 1
  AND category = 'Sachet';

-- For everything else (Syrup, Injection, Cream, Drops, General): keep strip_size = 1
UPDATE public.inventory
SET
  sell_unit = 'piece'
WHERE
  strip_size = 1
  AND category IN ('Syrup', 'Injection', 'Ointment', 'Cream', 'Drops', 'General');


-- ─────────────────────────────────────────────────────────────
-- STEP 5: SANITY CHECK — show summary after migration
-- ─────────────────────────────────────────────────────────────
SELECT
  category,
  sell_unit,
  strip_size,
  COUNT(*)         AS product_count,
  SUM(stock)       AS total_stock_units,
  ROUND(AVG(buying_price)::numeric, 4) AS avg_buying_price
FROM public.inventory
WHERE is_active = TRUE
GROUP BY category, sell_unit, strip_size
ORDER BY category;


-- ─────────────────────────────────────────────────────────────
-- STEP 6: FLAG ALERT — products where buying_price looks wrong
--   (For Tablet/Capsule: if buying_price > 50, likely it's
--    still per-strip price, not per-tablet)
--   Review these manually before next GRN.
-- ─────────────────────────────────────────────────────────────
SELECT
  id,
  name,
  category,
  strip_size,
  stock,
  buying_price,
  mrp,
  ROUND((buying_price * strip_size)::numeric, 2) AS implied_ptr_per_strip,
  '⚠️ buying_price may be per-strip still'       AS flag
FROM public.inventory
WHERE
  is_active   = TRUE
  AND strip_size >= 10
  AND buying_price > 20   -- per-tablet cost above ₹20 is unusual for most generics
ORDER BY buying_price DESC
LIMIT 50;

-- ============================================================
-- DONE ✅
-- Step 4 auto-fixed strip_size defaults.
-- Step 6 shows products you may want to manually review.
-- ============================================================
