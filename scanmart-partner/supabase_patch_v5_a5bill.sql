-- ══════════════════════════════════════════════════════════
-- PATCH v5: A5 Pharmacy Bill Support
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. Add drug_license column to store_settings
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS drug_license TEXT DEFAULT NULL;

-- 2. Verify
SELECT id, shop_name, gstin, drug_license
FROM store_settings
LIMIT 5;

-- ══════════════════════════════════════════════════════════
-- After running this SQL:
-- 1. Settings page mein Drug License field fill karo
-- 2. Hardware → Paper Type → "A5 Pharmacy" select karo
-- 3. POS se bill nikalo — A5 landscape format milega
-- ══════════════════════════════════════════════════════════
