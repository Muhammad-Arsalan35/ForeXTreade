// Service role client for admin operations (like user insertion during signup)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0";

// Service role client bypasses RLS policies
export const supabaseService = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});