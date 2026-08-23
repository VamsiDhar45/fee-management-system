import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql_query: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';" 
  });
  
  if (error) {
    console.log("Error running query (you may need to run this manually in the Supabase SQL editor):", error.message);
  } else {
    console.log("Migration applied successfully!");
  }
}

runMigration();
