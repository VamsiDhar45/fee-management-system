-- Migration: Add dashboard metrics RPC
-- This offloads the heavy aggregation logic to PostgreSQL, preventing the 1000-row limit issue in PostgREST.

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_start_date timestamptz DEFAULT '1970-01-01'::timestamptz,
    p_end_date timestamptz DEFAULT now(),
    p_today_start timestamptz DEFAULT current_date::timestamptz,
    p_today_end timestamptz DEFAULT now()
) RETURNS json AS $$
DECLARE
    v_active_students int;
    v_total_collections_today numeric;
    v_total_expected numeric;
    v_total_collected_all_time numeric;
    v_total_collected_range numeric;
    v_total_expenses_range numeric;
    v_total_expenses_this_month numeric;
    v_pending_expenses_count int;
    v_total_overdue numeric;
    v_monthly_data json;
    v_category_data json;
    v_expense_category_data json;
    v_collection_status_data json;
    v_entity_breakdown json;
    v_batch_stats json;
    v_net_profit numeric;
BEGIN
    -- 1. Basic counts (Snapshot)
    SELECT count(*) INTO v_active_students FROM students;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_total_collections_today 
    FROM incomes 
    WHERE created_at >= p_today_start AND created_at <= p_today_end;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_expected FROM fee_structures;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_collected_all_time FROM incomes;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_collected_range 
    FROM incomes 
    WHERE created_at >= p_start_date AND created_at <= p_end_date;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses_range 
    FROM expenses 
    WHERE created_at >= p_start_date AND created_at <= p_end_date 
      AND status != 'REJECTED';

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses_this_month
    FROM expenses 
    WHERE created_at >= date_trunc('month', p_today_start) 
      AND created_at <= p_today_end 
      AND status != 'REJECTED';

    SELECT count(*) INTO v_pending_expenses_count 
    FROM expenses 
    WHERE status = 'PENDING';

    -- 2. Overdue Calculation (Snapshot)
    SELECT COALESCE(SUM(amount_due - paid), 0) INTO v_total_overdue
    FROM (
        SELECT fi.amount_due, 
               COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.installment_id = fi.id), 0) as paid,
               fi.due_date,
               fi.status
        FROM fee_installments fi
    ) sub
    WHERE (amount_due - paid) > 0 AND due_date < (p_today_start AT TIME ZONE 'UTC')::date AND status != 'PAID';

    v_net_profit := v_total_collected_range - v_total_expenses_range;

    -- 3. Collection status data (Snapshot)
    v_collection_status_data := json_build_array(
        json_build_object('name', 'Collected', 'value', v_total_collected_all_time),
        json_build_object('name', 'Pending', 'value', GREATEST(0, v_total_expected - v_total_collected_all_time)),
        json_build_object('name', 'Overdue', 'value', v_total_overdue)
    );

    -- 4. Category Data (Within Range)
    SELECT COALESCE(json_agg(json_build_object('name', cat, 'value', val)), '[]'::json) INTO v_category_data
    FROM (
        SELECT COALESCE(fc.category_name, 'Uncategorized') as cat, SUM(ia.amount) as val
        FROM income_allocations ia
        LEFT JOIN fee_components fc ON ia.fee_component_id = fc.id
        JOIN incomes i ON ia.income_id = i.id
        WHERE i.created_at >= p_start_date AND i.created_at <= p_end_date
        GROUP BY cat
    ) sub;

    -- 5. Expense Category Data (Within Range)
    SELECT COALESCE(json_agg(json_build_object('name', cat, 'value', val)), '[]'::json) INTO v_expense_category_data
    FROM (
        SELECT COALESCE(ec.name, 'Uncategorized') as cat, SUM(e.amount) as val
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.created_at >= p_start_date AND e.created_at <= p_end_date AND e.status != 'REJECTED'
        GROUP BY cat
    ) sub;

    -- 6. Monthly Data (last 6 months from today_start)
    SELECT COALESCE(json_agg(
        json_build_object('month', month, 'income', inc, 'expense', exp)
    ), '[]'::json) INTO v_monthly_data
    FROM (
        SELECT to_char(dt, 'Mon YY') as month, 
               COALESCE(SUM(i_amt), 0) as inc, 
               COALESCE(SUM(e_amt), 0) as exp
        FROM (
            SELECT date_trunc('month', created_at) as dt, amount as i_amt, 0 as e_amt 
            FROM incomes 
            WHERE created_at >= (p_today_start - INTERVAL '5 months')
            UNION ALL
            SELECT date_trunc('month', created_at) as dt, 0 as i_amt, amount as e_amt 
            FROM expenses 
            WHERE status != 'REJECTED' AND created_at >= (p_today_start - INTERVAL '5 months')
        ) combined
        GROUP BY dt
        ORDER BY dt
    ) sub;

    -- 7. Entity Breakdown (Expected snapshot, Collected/Expenses in range)
    SELECT COALESCE(json_agg(row_to_json(e_stats)), '[]'::json) INTO v_entity_breakdown
    FROM (
        SELECT 
            e.id, e.name,
            COALESCE((SELECT SUM(total_amount) FROM fee_structures fs JOIN students s ON s.id = fs.student_id WHERE s.entity_id = e.id), 0) as expected,
            COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.entity_id = e.id AND i.created_at >= p_start_date AND i.created_at <= p_end_date), 0) as collected,
            COALESCE((SELECT SUM(amount) FROM expenses exp WHERE exp.entity_id = e.id AND exp.status != 'REJECTED' AND exp.created_at >= p_start_date AND exp.created_at <= p_end_date), 0) as expenses,
            COALESCE((
                SELECT SUM(fi.amount_due - COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.installment_id = fi.id), 0))
                FROM fee_installments fi
                JOIN fee_structures fs ON fs.id = fi.fee_structure_id
                JOIN students s ON s.id = fs.student_id
                WHERE s.entity_id = e.id 
                  AND fi.due_date < (p_today_start AT TIME ZONE 'UTC')::date 
                  AND fi.status != 'PAID'
            ), 0) as overdue
        FROM entities e
    ) e_stats;

    SELECT COALESCE(json_agg(row_to_json(b_stats)), '[]'::json) INTO v_batch_stats
    FROM (
        SELECT 
            b.id, b.name, b.entity_id,
            COALESCE((SELECT SUM(total_amount) FROM fee_structures fs JOIN students s ON s.id = fs.student_id WHERE s.batch_id = b.id), 0) as expected,
            COALESCE((SELECT SUM(amount) FROM incomes i JOIN students s ON s.id = i.student_id WHERE s.batch_id = b.id AND i.created_at >= p_start_date AND i.created_at <= p_end_date), 0) as collected,
            COALESCE((SELECT SUM(amount) FROM expenses exp WHERE exp.batch_id = b.id AND exp.status != 'REJECTED' AND exp.created_at >= p_start_date AND exp.created_at <= p_end_date), 0) as expenses,
            COALESCE((
                SELECT SUM(fi.amount_due - COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.installment_id = fi.id), 0))
                FROM fee_installments fi
                JOIN fee_structures fs ON fs.id = fi.fee_structure_id
                JOIN students s ON s.id = fs.student_id
                WHERE s.batch_id = b.id 
                  AND fi.due_date < (p_today_start AT TIME ZONE 'UTC')::date 
                  AND fi.status != 'PAID'
            ), 0) as overdue
        FROM batches b
    ) b_stats;

    RETURN json_build_object(
        'activeStudents', v_active_students,
        'totalCollectionsToday', v_total_collections_today,
        'pendingFees', GREATEST(0, v_total_expected - v_total_collected_all_time),
        'totalOverdue', v_total_overdue,
        'totalExpensesThisMonth', v_total_expenses_this_month,
        'pendingExpensesCount', v_pending_expenses_count,
        'netProfit', v_net_profit,
        'categoryData', v_category_data,
        'expenseCategoryData', v_expense_category_data,
        'monthlyData', v_monthly_data,
        'collectionStatusData', v_collection_status_data,
        'entities', v_entity_breakdown,
        'batches', v_batch_stats
    );
END;
$$ LANGUAGE plpgsql;
