-- Create Fee Components Table to track the breakdown of Total Fee (e.g. Tuition, Hostel)
CREATE TABLE IF NOT EXISTS fee_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add a permissive policy so the client can insert rows without auth
ALTER TABLE fee_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for fee_components" ON fee_components;
CREATE POLICY "Allow all for fee_components" ON fee_components
    FOR ALL
    USING (true)
    WITH CHECK (true);
