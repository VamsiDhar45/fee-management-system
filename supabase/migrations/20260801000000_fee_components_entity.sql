-- 1. Add entity_id to fee_components
ALTER TABLE fee_components ADD COLUMN entity_id UUID REFERENCES entities(id);

-- 2. Backfill existing fee_components with the student's primary entity_id
UPDATE fee_components fc
SET entity_id = s.entity_id
FROM fee_structures fs
JOIN students s ON fs.student_id = s.id
WHERE fc.fee_structure_id = fs.id;

-- 3. Make entity_id NOT NULL
ALTER TABLE fee_components ALTER COLUMN entity_id SET NOT NULL;
