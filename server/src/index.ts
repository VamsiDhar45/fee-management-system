import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gurukul Fee Management API is running' });
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.post('/api/users', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create user in auth schema
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) throw authError;

    // 2. Insert into profiles table
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: authData.user.id, name, role }
      ]);
      if (profileError) {
        // Rollback? Optional for now, but good practice.
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }
    }

    res.status(201).json({ message: 'User created successfully', user: authData.user });
  } catch (error: any) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/notify-expense', async (req, res) => {
  console.log('Received notify-expense request:', req.body);
  const { amount, category, date } = req.body;
  
  if (!amount || !category || !date) {
    console.warn('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { SMS_API_USER, SMS_API_PASS, SMS_API_SENDER, MANAGER_PHONES } = process.env;
  console.log(`Using SMS Config - User: ${SMS_API_USER}, Sender: ${SMS_API_SENDER}, Phones: ${MANAGER_PHONES}`);

  if (!SMS_API_USER || !SMS_API_PASS || !MANAGER_PHONES) {
    console.error('SMS API credentials or MANAGER_PHONES not configured in environment.');
    return res.status(500).json({ error: 'Server configuration error for SMS' });
  }

  try {
    const phones = MANAGER_PHONES.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    const params = `${amount},${category},${date}`;
    console.log(`Sending SMS to ${phones.length} phones with params: ${params}`);
    
    // We fire a request for each phone number
    const promises = phones.map((phone: string) => {
      const url = new URL('http://bhashsms.com/api/sendmsgutil.php');
      url.searchParams.append('user', SMS_API_USER);
      url.searchParams.append('pass', SMS_API_PASS);
      if (SMS_API_SENDER) url.searchParams.append('sender', SMS_API_SENDER);
      url.searchParams.append('phone', phone);
      url.searchParams.append('text', 'expencenotification');
      url.searchParams.append('priority', 'wa');
      url.searchParams.append('stype', 'normal');
      url.searchParams.append('Params', params);

      const requestUrl = url.toString();
      console.log(`Firing URL: ${requestUrl}`);

      return fetch(requestUrl)
        .then(async (response) => {
          const text = await response.text();
          console.log(`Response for ${phone}: ${response.status} ${text}`);
          if (!response.ok) {
            throw new Error(`SMS API error for ${phone}: ${response.statusText}`);
          }
          return { phone, response: text };
        });
    });

    const results = await Promise.allSettled(promises);
    
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn('Some SMS notifications failed:', failed);
    }

    res.json({ success: true, results: results.map(r => r.status) });
  } catch (error: any) {
    console.error('Error sending expense notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
