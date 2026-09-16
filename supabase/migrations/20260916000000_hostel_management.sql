-- Hostel Management Schema

-- 1. Vendors
CREATE TABLE hostel_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- 2. Items
CREATE TABLE hostel_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    default_unit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- 3. Purchases
CREATE TABLE hostel_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES hostel_vendors(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(255),
    purchase_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- For future use if tracking payments
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- 4. Purchase Items (Line items for each purchase)
CREATE TABLE hostel_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES hostel_purchases(id) ON DELETE CASCADE,
    item_id UUID REFERENCES hostel_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hostel_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_purchase_items ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies allowing full access for authenticated users
CREATE POLICY "Allow full access for authenticated users" ON hostel_vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON hostel_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON hostel_purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON hostel_purchase_items FOR ALL TO authenticated USING (true);

-- Create triggers for audit columns
CREATE TRIGGER trg_hostel_vendors_audit
BEFORE UPDATE ON hostel_vendors
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

CREATE TRIGGER trg_hostel_items_audit
BEFORE UPDATE ON hostel_items
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

CREATE TRIGGER trg_hostel_purchases_audit
BEFORE UPDATE ON hostel_purchases
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();
