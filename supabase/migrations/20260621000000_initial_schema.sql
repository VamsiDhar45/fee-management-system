-- INITIAL SCHEMA FOR GURUKUL FEE MANAGEMENT

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('manager', 'accountant');
CREATE TYPE payment_mode AS ENUM ('CASH', 'UPI', 'BANK');
CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE installment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- 1. PROFILES (Extends Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'accountant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ENTITIES (The 5+ Branches/Levels)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BATCHES (Classes within Entities)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. STUDENTS
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    batch_id UUID REFERENCES batches(id),
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FEE STRUCTURES (Assigned at Onboarding)
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FEE INSTALLMENTS (Can be 1 lump-sum or multiple)
CREATE TABLE fee_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount_due DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status installment_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. INCOME (Fee Collections)
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    student_id UUID REFERENCES students(id),
    installment_id UUID REFERENCES fee_installments(id),
    amount DECIMAL(12, 2) NOT NULL,
    payment_mode payment_mode NOT NULL,
    reference_number VARCHAR(255), -- Required if UPI/BANK
    payment_date DATE DEFAULT CURRENT_DATE,
    collected_by UUID REFERENCES profiles(id),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. EXPENSE CATEGORIES
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 9. EXPENSES (Outflows needing approval)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id),
    batch_id UUID REFERENCES batches(id),
    category_id UUID REFERENCES expense_categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    receipt_image_url TEXT,
    status expense_status DEFAULT 'PENDING',
    expense_date DATE DEFAULT CURRENT_DATE,
    submitted_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We can create views or queries later that union `incomes` and `expenses` 
-- to generate the Profitability and Daily Collection Reports (DCR).
