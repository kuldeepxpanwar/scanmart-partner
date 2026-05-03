-- ============================================================
-- ScanMart — Pharmacy Unit Fix — Patch v4
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-05-03
-- PURPOSE: Phase 1 — Add strip_size column to grn_items
--          so that GRN finalize can do correct unit conversion
-- ============================================================
-- SAFE TO RUN MULTIPLE TIMES (idempotent)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add strip_size to grn_items
--   strip_size = tablets per strip (e.g. 10, 15, 6, 3)
--   Default = 1 (piece — for syrup, injection, etc.)
--   This column lets GRN know how many tablets are in 1 strip
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.grn_items
  ADD COLUMN IF NOT EXISTS strip_size integer NOT NULL DEFAULT 1;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Add ptr_per_strip to inventory (reference column)
--   Stores original invoice PTR (per strip) for audit/reference
--   Does NOT affect any billing logic — purely informational
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS ptr_per_strip numeric(10, 4);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Ensure strip_size and pack_size exist on inventory
--   These should already exist — ADD COLUMN IF NOT EXISTS is safe
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS strip_size integer NOT NULL DEFAULT 1;

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS pack_size integer NOT NULL DEFAULT 1;

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS sell_unit text NOT NULL DEFAULT 'piece';

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Ensure inventory_batches has strip_size too
--   (for future reference when a batch was imported)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_batches
  ADD COLUMN IF NOT EXISTS strip_size integer NOT NULL DEFAULT 1;

-- ─────────────────────────────────────────────────────────────
-- VERIFY — show current grn_items columns
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'grn_items'
ORDER BY ordinal_position;

-- ============================================================
-- DONE ✅ — Now deploy the updated grn/page.tsx for Phase 2
-- ============================================================
