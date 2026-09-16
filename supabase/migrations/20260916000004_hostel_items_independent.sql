-- Make hostel_items independent (remove vendor_id)
ALTER TABLE hostel_items DROP COLUMN IF EXISTS vendor_id;
