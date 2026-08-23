import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('entities').update({ name: 'Gurukul for MEC, CA & CMA', has_gst: true }).ilike('name', '%gurukul east%');
  await supabase.from('entities').update({ name: 'Chanakya Bhavan' }).ilike('name', '%gurukul north%');
  await supabase.from('entities').update({ name: 'Gowtham Degree College' }).ilike('name', '%gurukul south%');
  await supabase.from('entities').update({ name: 'Gurukul Junior College (Jnanamudra Educational Society)' }).ilike('name', '%gurukul west%');

  const { data: vagdevi } = await supabase.from('entities').select('*').eq('name', 'Vagdevi Bhawan');
  if (!vagdevi || vagdevi.length === 0) {
    await supabase.from('entities').insert({ name: 'Vagdevi Bhawan', has_gst: false });
  }
  console.log('Entities updated successfully!');
}
run();
