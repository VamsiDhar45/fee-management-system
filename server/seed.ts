import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding Database...');

  // 1. Entities (Branches)
  const branches = [
    { name: 'Gurukul - Madhapur', description: 'Main Branch' },
    { name: 'Gurukul - KPHB', description: 'KPHB Branch' },
    { name: 'Gurukul - Ameerpet', description: 'Ameerpet Branch' },
  ];

  const entities = [];
  for (const b of branches) {
    const { data, error } = await supabase.from('entities').insert(b).select().single();
    if (error) {
      console.error('Error inserting entity:', error);
      continue;
    }
    entities.push(data);
  }
  console.log(`Created ${entities.length} branches.`);

  // 2. Batches
  const batchNames = ['Full Stack Batch 1', 'Frontend Batch 2'];
  const batches = [];
  for (const entity of entities) {
    for (const b of batchNames) {
      const { data, error } = await supabase
        .from('batches')
        .insert({ entity_id: entity.id, name: `${entity.name} - ${b}` })
        .select()
        .single();
      if (error) {
        console.error('Error inserting batch:', error);
        continue;
      }
      batches.push(data);
    }
  }
  console.log(`Created ${batches.length} batches.`);

  // 3. Students, Fee Structures, Installments, Payments
  const studentsToCreate = [
    { name: 'Rahul Sharma', contact: '9876543210' },
    { name: 'Priya Singh', contact: '8765432109' },
    { name: 'Amit Kumar', contact: '7654321098' },
    { name: 'Sneha Gupta', contact: '6543210987' },
    { name: 'Vikram Reddy', contact: '5432109876' },
  ];

  for (let i = 0; i < studentsToCreate.length; i++) {
    const s = studentsToCreate[i];
    // randomly pick a batch
    const batch = batches[i % batches.length];
    
    // Create student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        entity_id: batch.entity_id,
        batch_id: batch.id,
        name: s.name,
        contact_number: s.contact,
        enrollment_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (studentError) {
      console.error('Error inserting student:', studentError);
      continue;
    }

    // Create Fee Structure
    const totalAmount = 30000;
    const { data: feeStructure, error: feeError } = await supabase
      .from('fee_structures')
      .insert({
        student_id: student.id,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (feeError) {
      console.error('Error inserting fee structure:', feeError);
      continue;
    }

    // Create fee components? Oh wait, fee_components isn't in the schema, it was an error I saw in api.ts maybe?
    // Let me check if fee_components exists. If it doesn't, we can skip it. Let's try to do it, if it fails, catch error.
    const { error: fcError } = await supabase.from('fee_components').insert([
      { fee_structure_id: feeStructure.id, category_name: 'Tuition Fee', amount: 25000 },
      { fee_structure_id: feeStructure.id, category_name: 'Registration Fee', amount: 5000 }
    ]);
    if (fcError) console.log('fee_components error (might not exist):', fcError.message);

    // Create Installments
    // 3 installments of 10000
    const installmentsData = [];
    const today = new Date();
    
    // Installment 1: Due last month (so it can be paid or overdue)
    const date1 = new Date(today);
    date1.setMonth(date1.getMonth() - 1);
    
    // Installment 2: Due today
    const date2 = new Date(today);
    
    // Installment 3: Due next month
    const date3 = new Date(today);
    date3.setMonth(date3.getMonth() + 1);

    const dates = [date1, date2, date3];
    for (let j = 0; j < dates.length; j++) {
      const { data: inst, error: instError } = await supabase
        .from('fee_installments')
        .insert({
          fee_structure_id: feeStructure.id,
          amount_due: 10000,
          due_date: dates[j].toISOString().split('T')[0],
          status: 'PENDING' // will update after payment
        })
        .select()
        .single();
      
      installmentsData.push(inst);
    }

    // Make some payments
    // Let's say Rahul and Priya paid their first installment fully
    if (i < 2) {
      const inst = installmentsData[0];
      const { data: income, error: incError } = await supabase
        .from('incomes')
        .insert({
          entity_id: student.entity_id,
          student_id: student.id,
          installment_id: inst.id,
          amount: 10000,
          payment_mode: 'UPI',
          reference_number: `UPI${Date.now()}`,
          receipt_number: `GKL-2026-${Date.now().toString().slice(-4)}`
        })
        .select()
        .single();

      if (!incError) {
        await supabase.from('fee_installments').update({ status: 'PAID' }).eq('id', inst.id);
        
        // Income Allocations
        const { error: iaError } = await supabase.from('income_allocations').insert([
          { income_id: income.id, fee_component_id: null, amount: 5000 },
          { income_id: income.id, fee_component_id: null, amount: 5000 }
        ]);
        if (iaError) console.log('income_allocations error:', iaError.message);
      }
    }
    
    // Amit paid partial
    if (i === 2) {
      const inst = installmentsData[0];
      const { data: income, error: incError } = await supabase
        .from('incomes')
        .insert({
          entity_id: student.entity_id,
          student_id: student.id,
          installment_id: inst.id,
          amount: 5000,
          payment_mode: 'CASH',
          receipt_number: `GKL-2026-${Date.now().toString().slice(-4)}`
        }).select().single();
      
      if (!incError) {
        await supabase.from('fee_installments').update({ status: 'PARTIAL' }).eq('id', inst.id);
      }
    }
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
