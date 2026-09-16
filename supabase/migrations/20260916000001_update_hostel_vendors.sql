-- Update Hostel Management Schema

-- 1. Remove entity_id from hostel_vendors
ALTER TABLE hostel_vendors DROP COLUMN IF EXISTS entity_id;

-- 2. Create Hostels table
CREATE TABLE hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies allowing full access for authenticated users
CREATE POLICY "Allow full access for authenticated users" ON hostels FOR ALL TO authenticated USING (true);

-- Create triggers for audit columns
CREATE TRIGGER trg_hostels_audit
BEFORE UPDATE ON hostels
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();
