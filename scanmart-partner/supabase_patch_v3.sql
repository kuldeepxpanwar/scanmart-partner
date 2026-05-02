ALTER TABLE grn_items ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;
ALTER TABLE grn_sessions ADD COLUMN IF NOT EXISTS invoice_amount numeric DEFAULT 0;
