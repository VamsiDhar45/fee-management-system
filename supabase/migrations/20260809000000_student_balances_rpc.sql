-- MIGRATION: Student Balances Report RPC

CREATE OR REPLACE FUNCTION get_student_balances_report(
    p_batch_id UUID DEFAULT NULL
) RETURNS TABLE (
    student_id UUID,
    student_name VARCHAR,
    batch_name VARCHAR,
    contact_number VARCHAR,
    enrollment_date DATE,
    total_fee DECIMAL,
    paid_cash DECIMAL,
    paid_upi DECIMAL,
    paid_bank DECIMAL,
    total_paid DECIMAL,
    balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.name as student_name,
        b.name as batch_name,
        s.contact_number,
        s.enrollment_date,
        COALESCE(fs.total_amount, 0) as total_fee,
        COALESCE(SUM(i.amount) FILTER (WHERE i.payment_mode = 'CASH'), 0) as paid_cash,
        COALESCE(SUM(i.amount) FILTER (WHERE i.payment_mode = 'UPI'), 0) as paid_upi,
        COALESCE(SUM(i.amount) FILTER (WHERE i.payment_mode = 'BANK'), 0) as paid_bank,
        COALESCE(SUM(i.amount), 0) as total_paid,
        (COALESCE(fs.total_amount, 0) - COALESCE(SUM(i.amount), 0)) as balance
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    LEFT JOIN fee_structures fs ON s.id = fs.student_id
    LEFT JOIN incomes i ON s.id = i.student_id
    WHERE (p_batch_id IS NULL OR s.batch_id = p_batch_id)
    GROUP BY s.id, s.name, b.name, s.contact_number, s.enrollment_date, fs.total_amount
    ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql;
