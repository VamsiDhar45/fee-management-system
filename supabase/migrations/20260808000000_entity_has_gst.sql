-- Add has_gst flag to entities table
ALTER TABLE entities ADD COLUMN IF NOT EXISTS has_gst BOOLEAN DEFAULT false;

-- Enable GST for 'gurukul east' entity based on name
UPDATE entities SET has_gst = true WHERE name ILIKE '%gurukul east%';
