import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const sql = `
    ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'CHEQUE';
    ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'ONLINE_TRANSFER';
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) console.error("Error:", error);
  else console.log("Success!");
}
run();
