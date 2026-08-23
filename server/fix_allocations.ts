import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllocations() {
  console.log('Fetching incomes without allocations...');
  
  const { data: incomes, error } = await supabase
    .from('incomes')
    .select('*, income_allocations(id)');
    
  if (error) {
    console.error('Error fetching incomes:', error);
    return;
  }
  
  const unallocatedIncomes = incomes.filter(inc => !inc.income_allocations || inc.income_allocations.length === 0);
  
  console.log(`Found ${unallocatedIncomes.length} unallocated incomes.`);
  
  for (const inc of unallocatedIncomes) {
    console.log(`Fixing income ${inc.id} for amount ${inc.amount}...`);
    
    const { data: feeStructure, error: fsError } = await supabase
      .from('fee_structures')
      .select('id, fee_components(*)')
      .eq('student_id', inc.student_id)
      .single();
      
    if (fsError || !feeStructure || !feeStructure.fee_components || feeStructure.fee_components.length === 0) {
      console.log(`  No fee components found for student ${inc.student_id}`);
      continue;
    }
    
    // Sort components by amount descending to allocate to the largest first, e.g. Tuition Fee
    const sortedComponents = feeStructure.fee_components.sort((a, b) => Number(b.amount) - Number(a.amount));
    const firstComponent = sortedComponents[0];
    
    console.log(`  Allocating ${inc.amount} to component ${firstComponent.category_name} (${firstComponent.id})`);
    
    const { error: insertError } = await supabase
      .from('income_allocations')
      .insert({
        income_id: inc.id,
        fee_component_id: firstComponent.id,
        amount: inc.amount
      });
      
    if (insertError) {
      console.error(`  Failed to insert allocation:`, insertError);
    } else {
      console.log(`  Successfully fixed!`);
    }
  }
  
  console.log('Done fixing allocations.');
}

fixAllocations();
