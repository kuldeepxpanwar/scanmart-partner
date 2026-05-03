-- ============================================================
-- ScanMart — Final Cleanup Patch
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-05-03
-- ============================================================
-- FIX 1: PEPSICA-D TAB 1*15 — correct strip_size to 15
-- FIX 2: Archive duplicate products (keep highest stock version)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- FIX 1: PEPSICA-D TAB 1*15 — strip_size was wrongly set to 10
--   Product name says 1*15 = 15 tablets per strip
--   Current stock=640 (should be 960), buying_price=13.17 (should be 8.78)
-- ─────────────────────────────────────────────────────────────

-- Step A: Find the product ID first (verify it)
SELECT id, name, category, strip_size, stock, buying_price
FROM public.inventory
WHERE name ILIKE '%pepsica%' AND is_active = TRUE;

-- Step B: Apply the correction
--   strip_size: 10 → 15
--   stock: currently 640 (was 64×10), should be 64×15=960 → multiply by 1.5
--   buying_price: currently 13.1664 (was /10), should be /15 → multiply by 10/15
UPDATE public.inventory
SET
  strip_size    = 15,
  stock         = ROUND((stock * 15.0 / 10.0)::numeric, 0)::integer,       -- 640 → 960
  buying_price  = ROUND((buying_price * 10.0 / 15.0)::numeric, 4)           -- 13.17 → 8.78
WHERE
  name ILIKE '%pepsica%'
  AND is_active = TRUE
  AND strip_size = 10;   -- safety guard: only apply if still at old value

-- Verify Fix 1
SELECT name, strip_size, stock, ROUND(buying_price::numeric, 4) AS buying_price, mrp
FROM public.inventory
WHERE name ILIKE '%pepsica%' AND is_active = TRUE;


-- ─────────────────────────────────────────────────────────────
-- FIX 2: Identify ALL duplicate products
-- ─────────────────────────────────────────────────────────────

-- Show duplicates grouped by cleaned name
SELECT
  TRIM(REPLACE(name, '"', ''))      AS clean_name,
  COUNT(*)                           AS duplicate_count,
  array_agg(id ORDER BY stock DESC) AS ids_by_stock,
  array_agg(stock ORDER BY stock DESC) AS stocks,
  MAX(stock)                         AS max_stock
FROM public.inventory
WHERE is_active = TRUE
GROUP BY TRIM(REPLACE(name, '"', ''))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;


-- ─────────────────────────────────────────────────────────────
-- FIX 2B: MERGE duplicates — combine stock into best record,
--   then archive the rest
--
--   Strategy:
--   - Keep the record with HIGHEST stock (or no leading quote in name)
--   - Add stock from duplicates to winner
--   - Archive (is_active = FALSE) all other duplicates
-- ─────────────────────────────────────────────────────────────

-- For each group of duplicates:
-- 1. Find winner (highest stock, clean name preferred)
-- 2. Add other records' stock to winner
-- 3. Archive others

DO $$
DECLARE
  dup RECORD;
  winner_id UUID;
  total_stock INTEGER;
  total_stock_batches INTEGER;
BEGIN
  FOR dup IN
    SELECT
      TRIM(REPLACE(name, '"', '')) AS clean_name
    FROM public.inventory
    WHERE is_active = TRUE
    GROUP BY TRIM(REPLACE(name, '"', ''))
    HAVING COUNT(*) > 1
  LOOP
    -- Pick winner: prefer name without quote, then highest stock
    SELECT id INTO winner_id
    FROM public.inventory
    WHERE
      is_active = TRUE
      AND TRIM(REPLACE(name, '"', '')) = dup.clean_name
    ORDER BY
      (name NOT LIKE '"%') DESC,   -- prefer names without leading quote
      stock DESC                    -- then highest stock
    LIMIT 1;

    -- Sum all stock across duplicates
    SELECT SUM(stock) INTO total_stock
    FROM public.inventory
    WHERE
      is_active = TRUE
      AND TRIM(REPLACE(name, '"', '')) = dup.clean_name;

    -- Fix winner's name (remove leading quote if present) + set combined stock
    UPDATE public.inventory
    SET
      name  = dup.clean_name,
      stock = total_stock
    WHERE id = winner_id;

    -- Archive all other duplicates (NOT the winner)
    UPDATE public.inventory
    SET is_active = FALSE
    WHERE
      is_active = TRUE
      AND TRIM(REPLACE(name, '"', '')) = dup.clean_name
      AND id <> winner_id;

    RAISE NOTICE 'Merged "%" → winner: %, total stock: %', dup.clean_name, winner_id, total_stock;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- VERIFY: After dedup — no more duplicates
-- ─────────────────────────────────────────────────────────────
SELECT
  name, category, strip_size, sell_unit,
  stock,
  ROUND(buying_price::numeric, 2) AS buying_price,
  mrp
FROM public.inventory
WHERE
  is_active = TRUE
  AND name IN ('Dettol Antiseptic', 'Sensodyne Paste', 'Vicks Vaporub',
               'PEPSICA - D TAB 1*15')
ORDER BY name;

-- Check no active duplicates remain
SELECT
  TRIM(REPLACE(name, '"', '')) AS clean_name,
  COUNT(*) AS count
FROM public.inventory
WHERE is_active = TRUE
GROUP BY TRIM(REPLACE(name, '"', ''))
HAVING COUNT(*) > 1;
-- Should return 0 rows ✅


-- ─────────────────────────────────────────────────────────────
-- FINAL: Full inventory sanity check
-- ─────────────────────────────────────────────────────────────
SELECT
  category,
  sell_unit,
  strip_size,
  COUNT(*)                                    AS products,
  SUM(stock)                                  AS total_units,
  ROUND(MIN(buying_price)::numeric, 2)        AS min_buy_price,
  ROUND(MAX(buying_price)::numeric, 2)        AS max_buy_price
FROM public.inventory
WHERE is_active = TRUE
GROUP BY category, sell_unit, strip_size
ORDER BY category, strip_size;

-- ============================================================
-- DONE ✅
-- PEPSICA corrected to strip_size=15
-- Duplicates merged and archived
-- ============================================================
