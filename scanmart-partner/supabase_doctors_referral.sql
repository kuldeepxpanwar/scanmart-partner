-- supabase_doctors_referral.sql

-- 1. Create a table to manage the list of Doctors associated with a store
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialization TEXT,
    phone TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0.00, -- e.g., 10.00 for 10%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for doctors
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store doctors" 
    ON doctors FOR SELECT 
    USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their own store doctors" 
    ON doctors FOR INSERT 
    WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their own store doctors" 
    ON doctors FOR UPDATE 
    USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 2. Add doctor_name tracking to the sales table to associate sales with a doctor (Uses IF NOT EXISTS to prevent errors if H1 register already added it)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS doctor_name TEXT;
