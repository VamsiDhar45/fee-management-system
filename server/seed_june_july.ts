import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function getRandomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Fetching pending installments to record as June/July incomes...');
  
  // Find pending installments
  const { data: installments, error: instError } = await supabase
    .from('fee_installments')
    .select('*, fee_structures(student_id, students(entity_id))')
    .eq('status', 'PENDING')
    .limit(30);
    
  if (instError || !installments) {
    console.error('Error fetching installments', instError);
    return;
  }

  let count = 0;
  for (const inst of installments) {
    // Only process about 20 of them
    if (count > 20) break;
    
    // Choose a date in either June or July
    const isJune = Math.random() > 0.5;
    const incomeDate = isJune 
        ? getRandomDate(new Date('2026-06-01'), new Date('2026-06-30'))
        : getRandomDate(new Date('2026-07-01'), new Date('2026-07-25'));
        
    const entityId = inst.fee_structures?.students?.entity_id;
    if (!entityId) continue;

    // Fetch fee components for allocation
    const { data: components } = await supabase
      .from('fee_components')
      .select('id')
      .eq('fee_structure_id', inst.fee_structure_id);

    // Update installment to PAID
    await supabase.from('fee_installments').update({ status: 'PAID' }).eq('id', inst.id);
    
    // Create income record
    const { data: income } = await supabase.from('incomes').insert({
        entity_id: entityId,
        student_id: inst.fee_structures.student_id,
        installment_id: inst.id,
        amount: inst.amount_due,
        payment_mode: getRandomItem(['UPI', 'CASH', 'BANK']),
        receipt_number: `GKL-JJ-${Math.floor(Math.random() * 100000)}`,
        created_at: incomeDate
    }).select().single();

    if (income && components && components.length > 0) {
        // Just allocate the entire amount to the first component for simplicity
        await supabase.from('income_allocations').insert({
            income_id: income.id,
            fee_component_id: components[0].id,
            amount: inst.amount_due
        });
    }
    
    count++;
  }
  
  console.log(`Successfully recorded ${count} incomes in June and July!`);
}

main().catch(console.error);
