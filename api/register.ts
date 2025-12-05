import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Handle CORS headers to allow requests from the client
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    return res.status(500).json({ error: 'Server Configuration Error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { 
    telegram_id, 
    username, 
    first_name, 
    last_name, 
    language_code, 
    timezone, 
    start_param 
  } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  try {
    // 3. Check Existence
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingUser) {
      // 4. Existing User: Update Metadata Only
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          first_name,
          last_name,
          language_code,
          timezone,
        })
        .eq('telegram_id', telegram_id);

      if (updateError) throw updateError;
      
      return res.status(200).json({ status: 'ok', message: 'User metadata updated' });
    }

    // 5. New User Logic
    let referredBy: number | null = null;
    let initialXp = 0;

    // Process Referral
    if (start_param && start_param.startsWith('ref_')) {
      const referrerIdRaw = start_param.split('ref_')[1];
      const referrerId = parseInt(referrerIdRaw, 10);

      // Validate: Is a number and not self-referral
      if (!isNaN(referrerId) && referrerId !== telegram_id) {
        
        // Check if referrer exists (Admin read)
        const { data: referrer } = await supabase
          .from('users')
          .select('telegram_id, xp, level')
          .eq('telegram_id', referrerId)
          .maybeSingle();

        if (referrer) {
          referredBy = referrerId;
          initialXp = 50; // Bonus for the new user

          // Reward the Referrer (+100 XP)
          const currentXp = referrer.xp || 0;
          const newRefXp = currentXp + 100;
          const newRefLevel = Math.floor(newRefXp / 100) + 1;

          await supabase
            .from('users')
            .update({ xp: newRefXp, level: newRefLevel })
            .eq('telegram_id', referrerId);
            
          console.log(`Referral applied: User ${telegram_id} referred by ${referrerId}`);
        }
      }
    }

    // Insert New User
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id,
        username,
        first_name,
        last_name,
        language_code,
        timezone,
        referred_by: referredBy,
        xp: initialXp,
        level: 1,
        total_coins: 0
      });

    if (insertError) throw insertError;

    return res.status(200).json({ status: 'ok', message: 'User created successfully' });

  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
