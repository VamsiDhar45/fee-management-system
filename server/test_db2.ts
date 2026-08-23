import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProject() {
  const { count, error } = await supabase.from('students').select('*', { count: 'exact', head: true });
  console.log("Students count locally:", count, error);
}

testProject();
