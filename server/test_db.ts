import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data: e } = await supabase.from('entities').select('*');
  console.log('Entities:', e);
  const { data: b } = await supabase.from('batches').select('*');
  console.log('Batches:', b);
}
test();
