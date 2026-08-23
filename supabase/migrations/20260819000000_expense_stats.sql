-- Migration to add RPC for expense stats

CREATE OR REPLACE FUNCTION get_expense_stats(
    p_entity_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_total_amount numeric;
    v_pending_count integer;
BEGIN
    WITH filtered_expenses AS (
        SELECT amount, status, expense_date, description
        FROM expenses
        WHERE (p_entity_id IS NULL OR entity_id = p_entity_id)
          AND (p_category_id IS NULL OR category_id = p_category_id)
          AND (p_status IS NULL OR p_status = '' OR status = p_status)
          AND (p_start_date IS NULL OR expense_date >= p_start_date)
          AND (p_end_date IS NULL OR expense_date <= p_end_date)
          AND (p_search_term IS NULL OR p_search_term = '' OR description ILIKE '%' || p_search_term || '%')
    )
    SELECT 
        COALESCE((SELECT SUM(amount) FROM filtered_expenses WHERE status != 'REJECTED'), 0),
        COALESCE((SELECT COUNT(*) FROM filtered_expenses WHERE status = 'PENDING'), 0)
    INTO v_total_amount, v_pending_count;

    RETURN json_build_object(
        'totalAmount', v_total_amount,
        'pendingCount', v_pending_count
    );
END;
$$ LANGUAGE plpgsql;
