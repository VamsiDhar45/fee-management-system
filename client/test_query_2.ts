import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://talpwujyepmjzlxobztq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbHB3dWp5ZXBtanpseG9ienRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDQzNzIsImV4cCI6MjA5ODEyMDM3Mn0.Kf3CjxJzaob9c_AQIcUdyBw2jJRB7O8DNX7phl1Vmbc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('\nTesting getDefaulters');
  let query = supabase
        .from('fee_installments')
        .select(`
          *,
          fee_structures!inner (
            fee_components!inner (entity_id),
            students!inner (
              *,
              batches (name)
            )
          ),
          incomes (amount)
        `)
        .eq('status', 'PENDING')
        .lt('due_date', new Date().toISOString())
        .eq('fee_structures.fee_components.entity_id', '550e8400-e29b-41d4-a716-446655440000');
        
  const def = await query;
  console.log('Defaulters Error:', def.error);
}

test();
