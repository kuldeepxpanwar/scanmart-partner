-- ============================================================
-- Schedule H / H1 Drug Register System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add Schedule H/H1 tracking flag to Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_h1 BOOLEAN DEFAULT false;

-- 2. Add Patient and Doctor info for compliance on Sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS patient_details TEXT;
