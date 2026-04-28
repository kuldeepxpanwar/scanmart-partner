-- ============================================================
-- Rack & Shelf Location Tracking Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add 'location' column to the 'inventory' table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='inventory' AND column_name='location'
  ) THEN 
    ALTER TABLE public.inventory ADD COLUMN location TEXT;
  END IF; 
END $$;

-- Comment for the column
COMMENT ON COLUMN public.inventory.location IS 'Rack and Shelf physical location of the product (e.g. Rack A, Shelf 3)';
