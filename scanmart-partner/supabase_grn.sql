-- ============================================================
-- GRN (Goods Receipt Note) System — ScanMart Pharmacy
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. GRN Sessions (one per supplier invoice)
CREATE TABLE IF NOT EXISTS grn_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  supplier_name TEXT,
  invoice_no TEXT,
  invoice_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | finalized | cancelled
  notes TEXT,
  total_items INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  created_by UUID,
  finalized_by UUID,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. GRN Line Items (staging — NOT yet in inventory)
CREATE TABLE IF NOT EXISTS grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES grn_sessions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  -- Product Info
  product_name TEXT NOT NULL,
  matched_product_id UUID,           -- NULL = new product
  is_new_product BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'Pharmacy',
  hsn_code TEXT,
  -- Batch Info
  batch_no TEXT,
  expiry_date DATE,
  -- Quantity
  qty INTEGER NOT NULL DEFAULT 0,
  qty_free INTEGER DEFAULT 0,
  total_qty INTEGER GENERATED ALWAYS AS (qty + qty_free) STORED,
  -- Pricing
  mrp NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,            -- buying price per unit
  discount_pct NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 5,
  -- Review flags
  status TEXT DEFAULT 'pending',     -- pending | approved | rejected
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grn_sessions_store ON grn_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_grn_sessions_status ON grn_sessions(status);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_product ON grn_items(matched_product_id);

-- 4. RLS Policies
ALTER TABLE grn_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grn_sessions_store_access" ON grn_sessions
  FOR ALL USING (true);

CREATE POLICY "grn_items_store_access" ON grn_items
  FOR ALL USING (true);
