-- Update Hostel Purchases Schema

-- 1. Remove entity_id and invoice_number from hostel_purchases
ALTER TABLE hostel_purchases DROP COLUMN IF EXISTS entity_id;
ALTER TABLE hostel_purchases DROP COLUMN IF EXISTS invoice_number;

-- 2. Add hostel_id to hostel_purchases
ALTER TABLE hostel_purchases ADD COLUMN hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE;
