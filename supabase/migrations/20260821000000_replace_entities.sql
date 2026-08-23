-- Replace existing entities with the new ones based on receipt examples
-- 'Gurukul East' is updated to 'Gurukul for MEC, CA & CMA' which has GST applied

UPDATE entities SET name = 'Gurukul for MEC, CA & CMA' WHERE name ILIKE '%gurukul east%';
UPDATE entities SET name = 'Chanakya Bhavan' WHERE name ILIKE '%gurukul north%';
UPDATE entities SET name = 'Gowtham Degree College' WHERE name ILIKE '%gurukul south%';
UPDATE entities SET name = 'Gurukul Junior College (Jnanamudra Educational Society)' WHERE name ILIKE '%gurukul west%';

-- Insert the remaining new entity
INSERT INTO entities (name, has_gst) 
SELECT 'Vagdevi Bhawan', false
WHERE NOT EXISTS (
    SELECT 1 FROM entities WHERE name = 'Vagdevi Bhawan'
);
