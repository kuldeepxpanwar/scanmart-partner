-- ============================================================
-- ScanMart — Final Minor Fixes
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-05-03
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- FIX 1: REOCEF LB 200 — sell_unit 'tablet' → 'strip'
--   sell_unit='strip' is the correct convention for POS.
--   POS already handles strip→tablet price conversion via strip_size.
-- ─────────────────────────────────────────────────────────────
UPDATE public.inventory
SET sell_unit = 'strip'
WHERE
  is_active  = TRUE
  AND category = 'Tablet'
  AND sell_unit = 'tablet';

-- Verify
SELECT name, sell_unit, strip_size FROM public.inventory
WHERE category = 'Tablet' AND is_active = TRUE
ORDER BY sell_unit;


-- ─────────────────────────────────────────────────────────────
-- FIX 2: Show products with buying_price = 0
--   These need manual price entry in inventory edit modal
-- ─────────────────────────────────────────────────────────────
SELECT
  id, name, category, strip_size,
  stock,
  buying_price,
  mrp,
  '⚠️ buying_price is 0 — update via inventory edit' AS action
FROM public.inventory
WHERE
  is_active    = TRUE
  AND buying_price = 0
ORDER BY category, name;
-- Update these prices manually in the app's Inventory Edit modal.
-- No bulk SQL fix here — prices must be entered per product.


-- ─────────────────────────────────────────────────────────────
-- FIX 3: Merge 'Groceries' → 'Grocery' (standardize category name)
-- ─────────────────────────────────────────────────────────────
UPDATE public.inventory
SET category = 'Grocery'
WHERE is_active = TRUE AND category = 'Groceries';

-- Verify no more 'Groceries'
SELECT category, COUNT(*) AS count
FROM public.inventory
WHERE is_active = TRUE
GROUP BY category
ORDER BY category;


-- ─────────────────────────────────────────────────────────────
-- FINAL SUMMARY — Complete inventory health check
-- ─────────────────────────────────────────────────────────────
SELECT
  category,
  sell_unit,
  strip_size,
  COUNT(*)                             AS products,
  SUM(stock)                           AS total_units,
  COUNT(CASE WHEN buying_price = 0 THEN 1 END) AS zero_price_count,
  ROUND(MIN(buying_price)::numeric, 2) AS min_buy,
  ROUND(MAX(buying_price)::numeric, 2) AS max_buy
FROM public.inventory
WHERE is_active = TRUE
GROUP BY category, sell_unit, strip_size
ORDER BY category, strip_size;

-- ============================================================
-- ✅ ALL DONE — Phase 1 & 2 Complete
--
-- Summary of all changes made across all patches:
-- ┌──────────────────────────────────────────────────────────┐
-- │ v4.sql  → Added strip_size to grn_items + inventory      │
-- │ v4b.sql → Verified columns + auto-set Tablet strip_size  │
-- │ v4c.sql → Fixed stock (×strip_size) + price (÷strip_size)│
-- │           + Reverted single-unit Pharmacy items           │
-- │ v4d.sql → Fixed PEPSICA strip_size 10→15                 │
-- │           + Merged duplicate products                      │
-- │ v4e.sql → REOCEF sell_unit fix + Groceries merge          │
-- └──────────────────────────────────────────────────────────┘
--
-- grn/page.tsx → Now does correct unit conversion on finalize:
--   stock += qty_strips × strip_size      (tablets)
--   buying_price = PTR ÷ strip_size       (per tablet)
--   mrp stays per-strip                   (POS convention)
-- ============================================================
