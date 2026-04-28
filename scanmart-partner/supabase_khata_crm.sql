-- ============================================================
-- Khata (Ledger) & CRM (Chronic Patients) Migration
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$ 
BEGIN 
  -- Add Khata Balance (Udhaar)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='khata_balance') THEN 
    ALTER TABLE public.customers ADD COLUMN khata_balance NUMERIC DEFAULT 0;
  END IF; 

  -- Add Chronic Patient Flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='is_chronic') THEN 
    ALTER TABLE public.customers ADD COLUMN is_chronic BOOLEAN DEFAULT false;
  END IF; 

  -- Add Next Refill Date for Reminders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='next_refill_date') THEN 
    ALTER TABLE public.customers ADD COLUMN next_refill_date DATE;
  END IF; 
END $$;

-- Optional: Create a separate Customer Khata Transactions table for passbook style history
CREATE TABLE IF NOT EXISTS public.customer_khata_tx (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'payment')), -- credit = udhaar diya, payment = paise mile
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for the new table
ALTER TABLE public.customer_khata_tx ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_khata_tx_by_owner_store" ON public.customer_khata_tx
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );
