// Service role client for admin operations (like user insertion during signup)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// This module is intended for server-side/admin scripts only. Never ship the
// service role key to the browser. Protect against accidental usage.
if (typeof window !== 'undefined') {
  throw new Error('supabaseService must not be used in the browser');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env');
  throw new Error('Supabase service environment not configured');
}

// Service role client bypasses RLS policies
export const supabaseService = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});