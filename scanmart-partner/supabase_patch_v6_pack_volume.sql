-- ══════════════════════════════════════════════════════════
-- PATCH v6: pack_volume + volume_unit columns for syrups/gels
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. Add pack_volume (e.g. 100 for 100ml) and volume_unit (ml/gm/mg/iu)
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS pack_volume INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS volume_unit TEXT DEFAULT NULL;

-- 2. Auto-populate from existing product names (best-effort)
-- Pattern: SYP-1*100 → pack_volume=100, volume_unit='ml'
UPDATE inventory SET
  pack_volume = CAST(split_part(name, '*', 2) AS INT),
  volume_unit = 'ml'
WHERE
  sell_unit = 'piece'
  AND name ~* '(syp|syrup|sol|liq)'
  AND name LIKE '%*%'
  AND pack_volume IS NULL
  AND split_part(name, '*', 2) ~ '^[0-9]+$';

-- 3. Gels/Creams → gm
UPDATE inventory SET
  pack_volume = CAST(split_part(name, '-', -1) AS INT),
  volume_unit = 'gm'
WHERE
  sell_unit = 'piece'
  AND name ~* '(gel|cream|oint)'
  AND name ~ '-[0-9]+ ?gm'
  AND pack_volume IS NULL;

-- 4. Verify
SELECT id, name, sell_unit, strip_size, pack_volume, volume_unit
FROM inventory
WHERE sell_unit = 'piece'
ORDER BY name
LIMIT 20;

-- ══════════════════════════════════════════════════════════
-- After running:
-- 1. POSCartTable will auto-show "100 ML" for syrups
-- 2. Inventory edit modal mein pack_volume field fill karo
-- ══════════════════════════════════════════════════════════
