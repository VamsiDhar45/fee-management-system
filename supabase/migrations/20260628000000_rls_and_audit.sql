-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_allocations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies allowing full access for authenticated users
-- In a real production scenario, these would be filtered by role (e.g., accountants cannot delete).
CREATE POLICY "Allow full access for authenticated users" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON entities FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON fee_structures FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON fee_installments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON incomes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON expense_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON fee_components FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON income_allocations FOR ALL TO authenticated USING (true);

-- Add created_by and updated_by to incomes and expenses
ALTER TABLE incomes 
ADD COLUMN created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
ADD COLUMN updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE expenses 
ADD COLUMN created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
ADD COLUMN updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid();
-- expenses already has updated_at

-- Create trigger to automatically update updated_at and updated_by
CREATE OR REPLACE FUNCTION handle_audit_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incomes_audit
BEFORE UPDATE ON incomes
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

CREATE TRIGGER trg_expenses_audit
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();
