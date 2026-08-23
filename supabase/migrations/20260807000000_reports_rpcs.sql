-- Migration to add RPCs for Reports
-- File: 20260807000000_reports_rpcs.sql

-- 1. Daily Collection Report (DCR)
CREATE OR REPLACE FUNCTION get_dcr_report(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
    collection_date DATE,
    payment_mode TEXT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(i.created_at) AS collection_date,
        i.payment_mode::TEXT,
        SUM(i.amount) AS total_amount
    FROM incomes i
    WHERE 
        (p_start_date IS NULL OR i.created_at >= p_start_date)
        AND (p_end_date IS NULL OR i.created_at <= p_end_date)
        AND (p_entity_id IS NULL OR i.entity_id = p_entity_id)
    GROUP BY DATE(i.created_at), i.payment_mode
    ORDER BY DATE(i.created_at) DESC, i.payment_mode;
END;
$$;

-- 2. Component Revenue Report
CREATE OR REPLACE FUNCTION get_component_revenue_report(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
    category_name TEXT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fc.category_name,
        SUM(ia.amount) AS total_amount
    FROM income_allocations ia
    JOIN incomes i ON ia.income_id = i.id
    JOIN fee_components fc ON ia.fee_component_id = fc.id
    WHERE 
        (p_start_date IS NULL OR i.created_at >= p_start_date)
        AND (p_end_date IS NULL OR i.created_at <= p_end_date)
        AND (p_entity_id IS NULL OR i.entity_id = p_entity_id)
    GROUP BY fc.category_name
    ORDER BY total_amount DESC;
END;
$$;

-- 3. Expense Summary Report
CREATE OR REPLACE FUNCTION get_expense_summary_report(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
    category_name TEXT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.name AS category_name,
        SUM(e.amount) AS total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE 
        (p_start_date IS NULL OR e.created_at >= p_start_date)
        AND (p_end_date IS NULL OR e.created_at <= p_end_date)
        AND (p_entity_id IS NULL OR e.entity_id = p_entity_id)
        AND e.status = 'APPROVED' -- Assuming we only report on approved expenses
    GROUP BY ec.name
    ORDER BY total_amount DESC;
END;
$$;
