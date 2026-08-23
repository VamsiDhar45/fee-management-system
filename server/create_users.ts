import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(email: string, role: string) {
  const password = 'Password123!';
  const name = email.split('@')[0];

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${email} already exists.`);
        return;
      }
      throw authError;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: authData.user.id, name, role }
      ]);
      if (profileError) {
        console.error('Error creating profile for', email, profileError);
      } else {
        console.log(`Successfully created user: ${email} with role: ${role}, password: ${password}`);
      }
    }
  } catch (error: any) {
    console.error(`Error creating user ${email}:`, error.message);
  }
}

async function main() {
  await createUser('manager@gurukul.com', 'manager');
  await createUser('accountant@gurukul.com', 'accountant');
  process.exit(0);
}

main();
