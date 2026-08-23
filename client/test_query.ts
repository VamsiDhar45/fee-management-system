import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  let query = supabase
      .from('fee_installments')
      .select(`
        *,
        fee_structures!inner (
          students!inner (
            *,
            entities (name),
            batches (name)
          )
        ),
        incomes (amount)
      `)
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'PAID')
      .order('due_date', { ascending: true })
      .eq('fee_structures.students.entity_id', 'some-uuid');

  const { data, error } = await query;
  console.log(JSON.stringify(error || data, null, 2));
}

test();
