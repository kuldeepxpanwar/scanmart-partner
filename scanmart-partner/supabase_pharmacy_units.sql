-- ============================================================
-- ScanMart Pharmacy — Multi-Unit Inventory Migration
-- Run in: Supabase Dashboard → SQL Editor
-- Date: 2026-04-26
-- ============================================================
-- Safe to run multiple times (IF NOT EXISTS)
-- ============================================================

-- 1️⃣ Add pack_size: strips per box (default 1 = non-tablet items)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS pack_size integer DEFAULT 1;

-- 2️⃣ Add strip_size: tablets per strip (default 1 = non-tablet items)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS strip_size integer DEFAULT 1;

-- 3️⃣ Add sell_unit: default selling unit for billing
-- Values: 'box', 'strip', 'tablet', 'piece'
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS sell_unit text DEFAULT 'strip';

-- ============================================================
-- DONE ✅
-- Default values (1, 1, 'strip') ensure existing products
-- continue to work exactly as before — zero breaking changes.
-- ============================================================
