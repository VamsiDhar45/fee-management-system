import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sql = `
CREATE OR REPLACE FUNCTION record_payment(
  p_entity_id UUID,
  p_student_id UUID,
  p_installment_id UUID,
  p_amount DECIMAL,
  p_payment_mode TEXT,
  p_reference_number TEXT,
  p_receipt_number TEXT,
  p_allocations JSONB
) RETURNS JSONB AS $$
DECLARE
  v_income_id UUID;
  v_allocation JSONB;
BEGIN
  -- Insert into incomes
  INSERT INTO incomes (
    entity_id, student_id, installment_id, amount, payment_mode, reference_number, receipt_number
  ) VALUES (
    p_entity_id, p_student_id, p_installment_id, p_amount, p_payment_mode::payment_mode, p_reference_number, p_receipt_number
  ) RETURNING id INTO v_income_id;

  -- Insert allocations
  FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO income_allocations (
      income_id, fee_component_id, amount
    ) VALUES (
      v_income_id, 
      (v_allocation->>'fee_component_id')::UUID, 
      (v_allocation->>'amount')::DECIMAL
    );
  END LOOP;

  -- Update installment status if fully paid
  UPDATE fee_installments 
  SET status = 'PAID'
  WHERE id = p_installment_id 
  AND amount_due <= (
    SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE installment_id = p_installment_id
  );
  
  -- Partially paid status
  UPDATE fee_installments 
  SET status = 'PARTIAL'
  WHERE id = p_installment_id 
  AND status = 'PENDING'
  AND (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE installment_id = p_installment_id) > 0;

  RETURN jsonb_build_object('income_id', v_income_id);
END;
$$ LANGUAGE plpgsql;
  `;

  // We can execute raw SQL using Supabase rpc if there's an exec function, 
  // but if there isn't, we can use pg connection. 
  // Wait, Supabase js doesn't have raw sql execution easily.
  // Instead, let's just create an endpoint or script using postgres/pg.
}

main();
