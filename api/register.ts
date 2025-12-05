
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

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
    // --- STEP 1: Check if user exists ---
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (fetchError) {
      console.error("[REGISTER] Fetch Error:", JSON.stringify(fetchError));
      throw fetchError;
    }

    // If user exists, update metadata
    if (existingUser) {
      const updatePayload = {
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        language_code: language_code || null,
        timezone: timezone || 'UTC'
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('telegram_id', telegram_id);
      
      if (updateError) {
        console.error("[REGISTER] Update Error:", JSON.stringify(updateError));
        // We do not throw here to allow the process to "succeed" even if metadata update fails slightly
      }

      return res.status(200).json({ status: 'ok', message: 'User updated' });
    }

    // --- STEP 2: Logic for NEW user ---
    let referredBy: number | null = null;
    let initialXp = 0;
    let referrerToReward: number | null = null;

    // Parse referral
    if (start_param && typeof start_param === 'string' && start_param.startsWith('ref_')) {
      const refIdString = start_param.replace(/\D/g, ''); 
      const referrerId = parseInt(refIdString, 10);

      if (!isNaN(referrerId) && referrerId !== telegram_id) {
        // Check referrer existence
        const { data: referrer } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('telegram_id', referrerId)
          .maybeSingle();

        if (referrer) {
          referredBy = referrerId;
          initialXp = 50; 
          referrerToReward = referrerId;
          console.log(`[REGISTER] Valid referral: ${telegram_id} invited by ${referrerId}`);
        }
      }
    }

    // --- STEP 3: Create User ---
    const newUserPayload = {
      telegram_id: telegram_id,
      username: username || null, // Convert empty strings to null
      first_name: first_name || null,
      last_name: last_name || null,
      language_code: language_code || null,
      timezone: timezone || 'UTC',
      referred_by: referredBy,
      xp: initialXp,
      level: 1,
      total_coins: 0,
      current_streak: 0
    };

    console.log("[REGISTER] Inserting:", JSON.stringify(newUserPayload));

    // Use Upsert with ignoreDuplicates to handle race conditions safely
    const { data: insertedUser, error: upsertError } = await supabase
      .from('users')
      .upsert(newUserPayload, { onConflict: 'telegram_id', ignoreDuplicates: true })
      .select();

    if (upsertError) {
      console.error("[REGISTER] Supabase Insert/Upsert Error:", JSON.stringify(upsertError));
      throw upsertError;
    }

    // --- STEP 4: Update Fallback ---
    // If ignoreDuplicates: true triggered (user exists due to race condition), insertedUser might be empty.
    // We update metadata just in case to ensure fresh names/timezone.
    if (!insertedUser || insertedUser.length === 0) {
        await supabase.from('users').update({
            username: username || null,
            first_name: first_name || null,
            last_name: last_name || null,
            language_code: language_code || null,
            timezone: timezone || 'UTC'
        }).eq('telegram_id', telegram_id);
    }

    // --- STEP 5: Reward Referrer ---
    // Only reward if we actually inserted a new user (to prevent abuse/double counting)
    if (referrerToReward && insertedUser && insertedUser.length > 0) {
      try {
        const { data: currentRef } = await supabase
          .from('users')
          .select('xp')
          .eq('telegram_id', referrerToReward)
          .single();

        if (currentRef) {
          const newXp = (currentRef.xp || 0) + 100;
          const newLevel = Math.floor(newXp / 100) + 1;
          
          await supabase.from('users')
            .update({ xp: newXp, level: newLevel })
            .eq('telegram_id', referrerToReward);
            
          console.log(`[REGISTER] Reward sent to referrer ${referrerToReward}`);
        }
      } catch (err) {
        console.error(`[REGISTER] Failed to reward referrer ${referrerToReward}`, err);
      }
    }

    return res.status(200).json({ status: 'ok', message: 'User processed' });

  } catch (error: any) {
    console.error('[REGISTER] FATAL API ERROR:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
