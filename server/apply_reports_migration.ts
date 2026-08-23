import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260807000000_reports_rpcs.sql'), 'utf-8');
  
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql_query: sql
  });
  
  if (error) {
    console.error("Error running query:", error.message);
  } else {
    console.log("Reports RPCs Migration applied successfully!");
  }
}

runMigration();
