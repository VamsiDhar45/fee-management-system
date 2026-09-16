-- Update Hostel Items Schema

-- 1. Remove entity_id from hostel_items
ALTER TABLE hostel_items DROP COLUMN IF EXISTS entity_id;

-- 2. Add vendor_id to hostel_items
ALTER TABLE hostel_items ADD COLUMN vendor_id UUID REFERENCES hostel_vendors(id) ON DELETE CASCADE;
