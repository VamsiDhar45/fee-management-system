import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRPC() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_start_date: new Date('1970-01-01').toISOString(),
    p_end_date: new Date().toISOString(),
    p_today_start: todayStart.toISOString(),
    p_today_end: todayEnd.toISOString()
  });

  if (error) {
    console.error("RPC Error details:", error);
  } else {
    console.log("Success! Data:", JSON.stringify(data, null, 2));
  }
}

testRPC();
