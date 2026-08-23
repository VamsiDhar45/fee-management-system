import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_NAMES = ['CA26', 'F27', 'MA26'];
const STUDENT_NAMES = [
  'Aditi Sharma', 'Rohan Patel', 'Nisha Gupta', 'Karan Singh', 'Sneha Rao', 
  'Vikram Malhotra', 'Priya Kapoor', 'Amit Desai', 'Neha Reddy', 'Rahul Verma',
  'Anjali Joshi', 'Siddharth Iyer', 'Pooja Nair', 'Suresh Kumar', 'Kavya Pillai'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

async function clearEntityData(entityId: string) {
    const { data: students } = await supabase.from('students').select('id').eq('entity_id', entityId);
    const studentIds = students ? students.map(s => s.id) : [];
    
    if (studentIds.length > 0) {
      const { data: feeStructures } = await supabase.from('fee_structures').select('id').in('student_id', studentIds);
      const feeStructureIds = feeStructures ? feeStructures.map(f => f.id) : [];
      
      if (feeStructureIds.length > 0) {
        await supabase.from('fee_installments').delete().in('fee_structure_id', feeStructureIds);
        await supabase.from('fee_components').delete().in('fee_structure_id', feeStructureIds);
        await supabase.from('fee_structures').delete().in('student_id', studentIds);
      }
      
      const { data: incomes } = await supabase.from('incomes').select('id').eq('entity_id', entityId);
      const incomeIds = incomes ? incomes.map(i => i.id) : [];
      if (incomeIds.length > 0) {
        await supabase.from('income_allocations').delete().in('income_id', incomeIds);
        await supabase.from('incomes').delete().eq('entity_id', entityId);
      }
      
      await supabase.from('students').delete().eq('entity_id', entityId);
    }
    
    await supabase.from('expenses').delete().eq('entity_id', entityId);
    await supabase.from('batches').delete().eq('entity_id', entityId);
}

async function main() {
  const allowedNames = ['Gurukul East', 'Gurukul West', 'Gurukul North', 'Gurukul South'];
  
  const { data: entities, error: eError } = await supabase.from('entities').select('*');
  if (eError) {
    console.error('Error fetching entities', eError);
    return;
  }

  const { data: expenseCategories } = await supabase.from('expense_categories').select('*');
  if (!expenseCategories || expenseCategories.length === 0) {
      console.error('No expense categories found. Ensure seedExpenses.ts has been run.');
      return;
  }

  const toKeep = entities.filter(e => allowedNames.includes(e.name));

  console.log('Clearing old data for retained entities...');
  for (const e of toKeep) {
    await clearEntityData(e.id);
  }

  console.log('Old data cleared. Seeding rich demo data...');

  for (const e of toKeep) {
     console.log(`Seeding data for ${e.name}...`);
     const entityBatches = [];

     // 1. Create batches
     for (const bName of BATCH_NAMES) {
       const { data, error } = await supabase.from('batches').insert({ entity_id: e.id, name: bName }).select().single();
       if (error) console.log(`Error creating batch ${bName}:`, error.message);
       else entityBatches.push(data);
     }

     // 2. Create expenses
     for (let i = 0; i < 15; i++) {
        const cat = getRandomItem(expenseCategories);
        const amount = getRandomAmount(5000, 50000);
        // Backdated between Jan 1 and July 25
        const dateStr = getRandomDate(new Date('2026-01-01'), new Date('2026-07-25'));
        
        await supabase.from('expenses').insert({
          entity_id: e.id,
          category_id: cat.id,
          amount: amount,
          description: `${cat.name} expense for ${e.name}`,
          expense_date: dateStr.split('T')[0],
          status: Math.random() > 0.2 ? 'APPROVED' : 'PENDING',
          created_at: dateStr
        });
     }

     // 3. Create Students and Transactions
     for (const batch of entityBatches) {
        const numStudents = getRandomAmount(5, 8);
        for (let i = 0; i < numStudents; i++) {
           const studentName = getRandomItem(STUDENT_NAMES);
           const enrollDate = getRandomDate(new Date('2026-01-01'), new Date('2026-05-30'));
           
           const { data: student, error: sError } = await supabase.from('students').insert({
             entity_id: e.id,
             batch_id: batch.id,
             name: `${studentName} ${Math.floor(Math.random()*100)}`,
             contact_number: `98${getRandomAmount(10000000, 99999999)}`,
             enrollment_date: enrollDate.split('T')[0]
           }).select().single();

           if (!student) continue;

           const totalFee = getRandomAmount(50000, 100000);
           const { data: feeStructure } = await supabase.from('fee_structures').insert({
             student_id: student.id,
             total_amount: totalFee
           }).select().single();

           if (!feeStructure) continue;

           // Create Fee Components
           const tuition = Math.floor(totalFee * 0.8);
           const regFee = totalFee - tuition;
           
           const { data: fcTuition } = await supabase.from('fee_components').insert({
             fee_structure_id: feeStructure.id,
             category_name: 'Tuition Fee',
             amount: tuition
           }).select().single();
           
           const { data: fcReg } = await supabase.from('fee_components').insert({
             fee_structure_id: feeStructure.id,
             category_name: 'Registration Fee',
             amount: regFee
           }).select().single();

           // Create 3 installments
           const installmentAmount = Math.floor(totalFee / 3);
           const statuses = ['PAID', 'PARTIAL', 'PENDING'];
           const inst1Status = statuses[getRandomAmount(0, 1)]; 
           
           const { data: inst1 } = await supabase.from('fee_installments').insert({
             fee_structure_id: feeStructure.id,
             amount_due: installmentAmount,
             due_date: getRandomDate(new Date('2026-02-01'), new Date('2026-03-30')).split('T')[0],
             status: inst1Status
           }).select().single();

           const { data: inst2 } = await supabase.from('fee_installments').insert({
             fee_structure_id: feeStructure.id,
             amount_due: installmentAmount,
             due_date: getRandomDate(new Date('2026-04-01'), new Date('2026-05-30')).split('T')[0],
             status: 'PENDING'
           }).select().single();
           
           await supabase.from('fee_installments').insert({
             fee_structure_id: feeStructure.id,
             amount_due: totalFee - (2 * installmentAmount),
             due_date: getRandomDate(new Date('2026-06-01'), new Date('2026-07-25')).split('T')[0],
             status: 'PENDING'
           });

           // Add incomes and allocations based on installment status
           if (inst1Status === 'PAID' || inst1Status === 'PARTIAL') {
              const paidAmt = inst1Status === 'PAID' ? installmentAmount : Math.floor(installmentAmount / 2);
              const incomeDate = getRandomDate(new Date('2026-03-01'), new Date('2026-05-30'));
              
              const { data: income } = await supabase.from('incomes').insert({
                 entity_id: e.id,
                 student_id: student.id,
                 installment_id: inst1.id,
                 amount: paidAmt,
                 payment_mode: getRandomItem(['UPI', 'CASH', 'BANK']),
                 receipt_number: `GKL-26-${Math.floor(Math.random() * 100000)}`,
                 created_at: incomeDate
              }).select().single();

              if (income && fcTuition && fcReg) {
                  // Allocate income arbitrarily to tuition and reg fee
                  const allocReg = Math.min(paidAmt, regFee);
                  const allocTuition = paidAmt - allocReg;
                  
                  if (allocReg > 0) {
                     await supabase.from('income_allocations').insert({
                        income_id: income.id,
                        fee_component_id: fcReg.id,
                        amount: allocReg
                     });
                  }
                  if (allocTuition > 0) {
                     await supabase.from('income_allocations').insert({
                        income_id: income.id,
                        fee_component_id: fcTuition.id,
                        amount: allocTuition
                     });
                  }
              }
           }
        }
     }
  }

  console.log('Seeding completely finished!');
}

main().catch(console.error);
