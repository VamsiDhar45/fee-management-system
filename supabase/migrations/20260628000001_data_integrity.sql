-- Deduplicate entities
DO $$
DECLARE
    rec RECORD;
    kept_id UUID;
BEGIN
    FOR rec IN (SELECT name FROM entities GROUP BY name HAVING COUNT(*) > 1) LOOP
        -- Get the first one created
        SELECT id INTO kept_id FROM entities WHERE name = rec.name ORDER BY created_at ASC LIMIT 1;
        
        -- Update foreign keys
        UPDATE batches SET entity_id = kept_id WHERE entity_id IN (SELECT id FROM entities WHERE name = rec.name AND id != kept_id);
        UPDATE students SET entity_id = kept_id WHERE entity_id IN (SELECT id FROM entities WHERE name = rec.name AND id != kept_id);
        UPDATE incomes SET entity_id = kept_id WHERE entity_id IN (SELECT id FROM entities WHERE name = rec.name AND id != kept_id);
        UPDATE expenses SET entity_id = kept_id WHERE entity_id IN (SELECT id FROM entities WHERE name = rec.name AND id != kept_id);
        
        -- Delete duplicates
        DELETE FROM entities WHERE name = rec.name AND id != kept_id;
    END LOOP;
END $$;

-- Add UNIQUE constraint to entities name
ALTER TABLE entities ADD CONSTRAINT entities_name_key UNIQUE (name);

-- Add is_active soft delete column
ALTER TABLE entities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- RPC for Atomic Payment Processing
CREATE OR REPLACE FUNCTION record_payment(
  p_entity_id UUID,
  p_student_id UUID,
  p_installment_id UUID,
  p_amount DECIMAL,
  p_payment_mode VARCHAR,
  p_reference_number VARCHAR,
  p_receipt_number VARCHAR,
  p_allocations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_income_id UUID;
  v_income RECORD;
  v_total_paid DECIMAL;
  v_amount_due DECIMAL;
  v_status VARCHAR;
  alloc RECORD;
BEGIN
  -- 1. Insert into incomes
  INSERT INTO incomes (
    entity_id, student_id, installment_id, amount, payment_mode, reference_number, receipt_number
  ) VALUES (
    p_entity_id, p_student_id, p_installment_id, p_amount, p_payment_mode, p_reference_number, p_receipt_number
  ) RETURNING * INTO v_income;

  v_income_id := v_income.id;

  -- 2. Insert allocations
  IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
    FOR alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(fee_component_id UUID, amount DECIMAL)
    LOOP
      INSERT INTO income_allocations (income_id, fee_component_id, amount)
      VALUES (v_income_id, alloc.fee_component_id, alloc.amount);
    END LOOP;
  END IF;

  -- 3. Update installment status
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM incomes
  WHERE installment_id = p_installment_id;

  SELECT amount_due INTO v_amount_due
  FROM fee_installments
  WHERE id = p_installment_id;

  IF v_total_paid >= v_amount_due THEN
    v_status := 'PAID';
  ELSE
    v_status := 'PARTIAL';
  END IF;

  UPDATE fee_installments
  SET status = v_status, updated_at = NOW()
  WHERE id = p_installment_id;

  RETURN row_to_json(v_income);
END;
$$;
