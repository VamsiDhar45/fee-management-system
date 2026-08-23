-- Migration to add RPC for transaction stats

CREATE OR REPLACE FUNCTION get_transaction_stats(
    p_entity_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_payment_mode TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_total_amount numeric;
    v_entity_breakdown json;
BEGIN
    WITH filtered_incomes AS (
        SELECT i.amount, e.name as entity_name
        FROM incomes i
        JOIN entities e ON i.entity_id = e.id
        JOIN students s ON i.student_id = s.id
        WHERE (p_entity_id IS NULL OR i.entity_id = p_entity_id)
          AND (p_start_date IS NULL OR i.created_at >= p_start_date)
          AND (p_end_date IS NULL OR i.created_at <= p_end_date)
          AND (p_payment_mode IS NULL OR p_payment_mode = '' OR i.payment_mode::text = p_payment_mode)
          AND (p_search_term IS NULL OR p_search_term = '' OR s.name ILIKE '%' || p_search_term || '%')
    )
    SELECT 
        COALESCE((SELECT SUM(amount) FROM filtered_incomes), 0),
        COALESCE((
            SELECT json_agg(json_build_object('entityName', entity_name, 'amount', total_collected))
            FROM (
                SELECT entity_name, SUM(amount) as total_collected
                FROM filtered_incomes
                GROUP BY entity_name
                ORDER BY total_collected DESC
            ) sub
        ), '[]'::json)
    INTO v_total_amount, v_entity_breakdown;

    RETURN json_build_object(
        'totalAmount', v_total_amount,
        'entityBreakdown', v_entity_breakdown
    );
END;
$$ LANGUAGE plpgsql;
