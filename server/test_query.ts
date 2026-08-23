import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing RPC get_expense_summary_report');
  const expense = await supabase.rpc('get_expense_summary_report');
  console.log('Expense Result:', JSON.stringify(expense, null, 2));

  console.log('Testing RPC get_component_revenue_report');
  const revenue = await supabase.rpc('get_component_revenue_report');
  console.log('Revenue Result:', JSON.stringify(revenue, null, 2));
}

test();
