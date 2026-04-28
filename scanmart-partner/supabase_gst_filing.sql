-- ============================================================
-- GST Filing Output Migration
-- Add GSTIN to Customers for B2B tracking
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$ 
BEGIN 
  -- Add GSTIN for B2B customers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='gstin') THEN 
    ALTER TABLE public.customers ADD COLUMN gstin TEXT;
  END IF; 
END $$;
