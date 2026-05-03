-- ============================================================
-- ScanMart — Existing Data Migration (Bulk Fix)
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-05-03
-- ============================================================
-- PURPOSE: Fix buying_price and stock for existing inventory
--   rows that were entered under the old (broken) logic.
--
-- OLD logic: stock = strips, buying_price = per strip
-- NEW logic: stock = tablets, buying_price = per tablet
--
-- TWO groups to fix separately:
--   Group A → Tablet/Capsule: multiply stock, divide buying_price
--   Group B → Single-unit Pharmacy (Dettol/Vicks/Sensodyne etc.):
--             revert strip_size back to 1 (Step 4 wrongly set to 10)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- PRE-CHECK: See exactly what will change before applying
-- Run this SELECT first, verify numbers look correct.
-- ─────────────────────────────────────────────────────────────

-- Group A: Tablet/Capsule items needing stock + price fix
SELECT
  id, name, category, strip_size,
  stock                                                   AS stock_NOW,
  stock * strip_size                                      AS stock_AFTER,
  ROUND(buying_price::numeric, 4)                         AS buying_price_NOW,
  ROUND((buying_price / strip_size)::numeric, 4)          AS buying_price_AFTER,
  mrp                                                     AS mrp_unchanged
FROM public.inventory
WHERE
  is_active = TRUE
  AND category IN ('Tablet', 'Capsule')
  AND strip_size = 10
  AND buying_price > 20   -- per-tablet cost > ₹20 → still per-strip
ORDER BY buying_price DESC;


-- Group B: Single-unit items in Pharmacy that Step 4 wrongly set strip_size=10
-- Identified by typical single-unit product names
SELECT
  id, name, category, strip_size, sell_unit,
  stock, buying_price, mrp,
  'strip_size will be reset to 1, sell_unit to piece' AS action
FROM public.inventory
WHERE
  is_active = TRUE
  AND category = 'Pharmacy'
  AND strip_size = 10
  AND (
    name ILIKE '%dettol%'    OR
    name ILIKE '%antiseptic%' OR
    name ILIKE '%sensodyne%' OR
    name ILIKE '%vicks%'     OR
    name ILIKE '%vaporub%'   OR
    name ILIKE '%paste%'     OR
    name ILIKE '%liquid%'    OR
    name ILIKE '%lotion%'    OR
    name ILIKE '%shampoo%'   OR
    name ILIKE '%powder%'    OR
    name ILIKE '%spray%'     OR
    name ILIKE '%cream%'     OR
    name ILIKE '%gel%'       OR
    name ILIKE '%oint%'      OR
    name ILIKE '%soap%'      OR
    name ILIKE '%sanitizer%'
  )
ORDER BY name;


-- ─────────────────────────────────────────────────────────────
-- ✅ APPLY FIX A: Tablet/Capsule — stock & buying_price correction
-- ONLY run after verifying the SELECT above looks correct
-- ─────────────────────────────────────────────────────────────

BEGIN;

UPDATE public.inventory
SET
  stock         = stock * strip_size,              -- strips → tablets
  buying_price  = ROUND((buying_price / strip_size)::numeric, 4)  -- per-strip → per-tablet
WHERE
  is_active    = TRUE
  AND category IN ('Tablet', 'Capsule')
  AND strip_size = 10
  AND buying_price > 20;

-- Also fix inventory_batches for these products
-- (batch quantity and buying_price need same correction)
UPDATE public.inventory_batches ib
SET
  quantity      = ib.quantity * COALESCE(ib.strip_size, 10),
  buying_price  = ROUND((ib.buying_price / COALESCE(ib.strip_size, 10))::numeric, 4),
  strip_size    = COALESCE(ib.strip_size, 10)
FROM public.inventory inv
WHERE
  ib.product_id = inv.id
  AND inv.is_active  = TRUE
  AND inv.category  IN ('Tablet', 'Capsule')
  AND inv.strip_size = 10
  AND ib.buying_price > 20   -- same guard: only fix if still per-strip
  AND ib.quantity < 500;     -- guard: don't double-apply (if already in tablets, qty would be > 500 for most strips)

COMMIT;


-- ─────────────────────────────────────────────────────────────
-- ✅ APPLY FIX B: Pharmacy single-unit items
-- Revert strip_size=1, sell_unit=piece (Step 4 wrongly changed these)
-- buying_price and stock are already correct — do NOT change them
-- ─────────────────────────────────────────────────────────────

UPDATE public.inventory
SET
  strip_size = 1,
  pack_size  = 1,
  sell_unit  = 'piece'
WHERE
  is_active = TRUE
  AND category = 'Pharmacy'
  AND strip_size = 10
  AND (
    name ILIKE '%dettol%'    OR
    name ILIKE '%antiseptic%' OR
    name ILIKE '%sensodyne%' OR
    name ILIKE '%vicks%'     OR
    name ILIKE '%vaporub%'   OR
    name ILIKE '%paste%'     OR
    name ILIKE '%liquid%'    OR
    name ILIKE '%lotion%'    OR
    name ILIKE '%shampoo%'   OR
    name ILIKE '%powder%'    OR
    name ILIKE '%spray%'     OR
    name ILIKE '%cream%'     OR
    name ILIKE '%gel%'       OR
    name ILIKE '%oint%'      OR
    name ILIKE '%soap%'      OR
    name ILIKE '%sanitizer%'
  );


-- ─────────────────────────────────────────────────────────────
-- VERIFY: Run after both fixes — confirm numbers look right
-- ─────────────────────────────────────────────────────────────

SELECT
  name, category, strip_size, sell_unit,
  stock,
  ROUND(buying_price::numeric, 4) AS buying_price,
  mrp,
  ROUND((buying_price * strip_size)::numeric, 2) AS implied_ptr_per_strip
FROM public.inventory
WHERE
  is_active = TRUE
  AND name IN (
    'REOPOD CV 200 TAB-1*10', 'PEPSICA - D TAB 1*15',
    'NEUROBID NT TAB-1*10', 'CHYMERA TAB-1*10',
    'Dettol Antiseptic', 'Sensodyne Paste', 'Vicks Vaporub'
  )
ORDER BY name;


-- ─────────────────────────────────────────────────────────────
-- FINAL SANITY: No Tablet item should have buying_price > 20
-- after the fix (most generic tablet cost < ₹20/tablet)
-- If any still show > 20, review manually.
-- ─────────────────────────────────────────────────────────────
SELECT
  name, category, strip_size, stock,
  ROUND(buying_price::numeric, 2) AS buying_price,
  mrp,
  '⚠️ Still suspicious' AS flag
FROM public.inventory
WHERE
  is_active   = TRUE
  AND strip_size >= 10
  AND buying_price > 20
ORDER BY buying_price DESC;

-- ============================================================
-- DONE ✅
-- If the last SELECT returns 0 rows → all fixed!
-- If it still shows rows → those need manual review in inventory edit.
-- ============================================================
