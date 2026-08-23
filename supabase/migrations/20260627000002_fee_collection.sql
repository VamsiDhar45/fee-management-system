-- 1. Add Unique Receipt Number to Incomes
ALTER TABLE incomes ADD COLUMN receipt_number VARCHAR(50) UNIQUE;

-- 2. Create Income Allocations for precise tracking
CREATE TABLE IF NOT EXISTS income_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_id UUID REFERENCES incomes(id) ON DELETE CASCADE,
    fee_component_id UUID REFERENCES fee_components(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL
);

-- 3. Enable RLS and add permissive policy for income_allocations
ALTER TABLE income_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for income_allocations" ON income_allocations;
CREATE POLICY "Allow all for income_allocations" ON income_allocations
    FOR ALL
    USING (true)
    WITH CHECK (true);
