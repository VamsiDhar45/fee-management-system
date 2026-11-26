-- Payroll Management Schema (Idempotent / Safe to re-run)

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS payroll_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(50),
    address TEXT,
    nature_of_work VARCHAR(255),
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'bank')),
    salary_plan_type VARCHAR(20) NOT NULL CHECK (salary_plan_type IN ('monthly', 'hourly')),
    base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(150),
    bank_ifsc VARCHAR(50),
    bank_branch VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_employees_entity ON payroll_employees(entity_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employees_status ON payroll_employees(status);

-- Enable RLS
ALTER TABLE payroll_employees ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy so it never fails on re-run
DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_employees" ON payroll_employees;
CREATE POLICY "Allow full access for authenticated users on payroll_employees"
    ON payroll_employees FOR ALL TO authenticated USING (true);

-- Trigger for audit columns
DROP TRIGGER IF EXISTS trg_payroll_employees_audit ON payroll_employees;
CREATE TRIGGER trg_payroll_employees_audit
BEFORE UPDATE ON payroll_employees
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

-- 2. Employee Advances Table
CREATE TABLE IF NOT EXISTS payroll_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
    advance_amount DECIMAL(12, 2) NOT NULL CHECK (advance_amount > 0),
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deduction_start_month VARCHAR(7) NOT NULL, -- e.g. '2026-12' (YYYY-MM)
    installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    installment_amount DECIMAL(12, 2) NOT NULL CHECK (installment_amount > 0),
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank')),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    recovered_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid()
);

-- 3. Advance Installment Schedule / Recovery Ledger
CREATE TABLE IF NOT EXISTS payroll_advance_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID NOT NULL REFERENCES payroll_advances(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- '2026-12'
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'recovered', 'skipped', 'cancelled')),
    recovered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_advances_employee ON payroll_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_advances_status ON payroll_advances(status);
CREATE INDEX IF NOT EXISTS idx_payroll_adv_installments_adv ON payroll_advance_installments(advance_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adv_installments_month ON payroll_advance_installments(month_year);

ALTER TABLE payroll_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_advance_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_advances" ON payroll_advances;
CREATE POLICY "Allow full access for authenticated users on payroll_advances"
    ON payroll_advances FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_advance_installments" ON payroll_advance_installments;
CREATE POLICY "Allow full access for authenticated users on payroll_advance_installments"
    ON payroll_advance_installments FOR ALL TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_payroll_advances_audit ON payroll_advances;
CREATE TRIGGER trg_payroll_advances_audit
BEFORE UPDATE ON payroll_advances
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

-- 4. Monthly Payroll Summaries / Records Table
CREATE TABLE IF NOT EXISTS payroll_monthly_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM' e.g. '2026-11'
    base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    salary_plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly' or 'hourly'
    hours_worked DECIMAL(8, 2) NOT NULL DEFAULT 0,
    hourly_rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
    advances_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    advance_installment_id UUID REFERENCES payroll_advance_installments(id) ON DELETE SET NULL,
    tds_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    statutory_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bonus DECIMAL(12, 2) NOT NULL DEFAULT 0,
    leaves_taken INT NOT NULL DEFAULT 0,
    unpaid_leaves INT NOT NULL DEFAULT 0, -- Leaves beyond the 2 free leaves allowed per month
    leave_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    UNIQUE(employee_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_monthly_records_emp ON payroll_monthly_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_monthly_records_month ON payroll_monthly_records(month_year);

ALTER TABLE payroll_monthly_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_monthly_records" ON payroll_monthly_records;
CREATE POLICY "Allow full access for authenticated users on payroll_monthly_records"
    ON payroll_monthly_records FOR ALL TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_payroll_monthly_records_audit ON payroll_monthly_records;
CREATE TRIGGER trg_payroll_monthly_records_audit
BEFORE UPDATE ON payroll_monthly_records
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();

-- 5. Payroll Tax & Statutory Settings Table
CREATE TABLE IF NOT EXISTS payroll_tax_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    tds_threshold DECIMAL(12, 2) NOT NULL DEFAULT 50000,
    tds_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 10,
    pt_threshold DECIMAL(12, 2) NOT NULL DEFAULT 15000,
    pt_flat_amount DECIMAL(12, 2) NOT NULL DEFAULT 200,
    free_leaves_per_month INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE payroll_tax_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_tax_settings" ON payroll_tax_settings;
CREATE POLICY "Allow full access for authenticated users on payroll_tax_settings"
    ON payroll_tax_settings FOR ALL TO authenticated USING (true);

-- Insert default row if not exists
INSERT INTO payroll_tax_settings (id, tds_threshold, tds_rate_percent, pt_threshold, pt_flat_amount, free_leaves_per_month)
VALUES ('default', 50000, 10, 15000, 200, 2)
ON CONFLICT (id) DO NOTHING;


-- 6. Payroll Daily Attendance Table
CREATE TABLE IF NOT EXISTS payroll_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'holiday', 'leave')),
    hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 8.0,
    overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    check_in_time TIME,
    check_out_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    updated_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_attendance_emp ON payroll_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_attendance_date ON payroll_attendance(attendance_date);

ALTER TABLE payroll_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for authenticated users on payroll_attendance" ON payroll_attendance;
CREATE POLICY "Allow full access for authenticated users on payroll_attendance"
    ON payroll_attendance FOR ALL TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_payroll_attendance_audit ON payroll_attendance;
CREATE TRIGGER trg_payroll_attendance_audit
BEFORE UPDATE ON payroll_attendance
FOR EACH ROW
EXECUTE FUNCTION handle_audit_columns();
