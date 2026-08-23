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

async function seedExpenses() {
  console.log('Seeding Expense Categories...');

  const categories = [
    { name: 'Rent', description: 'Branch or facility rent' },
    { name: 'Electricity', description: 'Utility bills for electricity' },
    { name: 'Internet', description: 'Broadband and network expenses' },
    { name: 'Office Supplies', description: 'Stationery, markers, boards, etc.' },
    { name: 'Salaries', description: 'Staff and trainer salaries' },
    { name: 'Maintenance', description: 'Repairs and facility maintenance' },
    { name: 'Marketing', description: 'Advertising and promotions' },
    { name: 'Miscellaneous', description: 'Other unstructured expenses' }
  ];

  for (const cat of categories) {
    // Just insert, assuming table is mostly empty or it's safe to insert
    const { error } = await supabase.from('expense_categories').insert([cat]);
    if (error) {
      console.error(`Error inserting category ${cat.name}:`, error);
    } else {
      console.log(`Inserted category: ${cat.name}`);
    }
  }

  console.log('Setting up Storage Bucket for Receipts...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
  } else {
    const bucketExists = buckets.find(b => b.name === 'receipts');
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('receipts', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      });
      if (createError) {
        console.error('Error creating bucket:', createError);
      } else {
        console.log('Successfully created "receipts" storage bucket.');
      }
    } else {
      console.log('Bucket "receipts" already exists.');
    }
  }

  console.log('Done!');
  process.exit(0);
}

seedExpenses();
