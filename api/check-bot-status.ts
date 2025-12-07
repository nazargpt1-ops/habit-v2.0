
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('notifications_enabled')
      .eq('telegram_id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // Fallback: If user not found, return false
      return res.status(200).json({ enabled: false });
    }

    return res.status(200).json({ enabled: !!data?.notifications_enabled });
  } catch (e: any) {
    console.error('API Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
