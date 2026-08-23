import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getEntities() {
  const { data, error } = await supabase.from('entities').select('*').order('created_at', { ascending: true });
  console.log('Entities:', JSON.stringify(data, null, 2));
}

getEntities();
