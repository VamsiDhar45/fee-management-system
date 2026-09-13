-- 1. Add the new columns to the incomes table
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 2. Update existing rows to have the 'ACTIVE' status (just to be safe, though the default handles it)
UPDATE incomes SET status = 'ACTIVE' WHERE status IS NULL;
