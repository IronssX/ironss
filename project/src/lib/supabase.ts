import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_NOT_CONFIGURED_MESSAGE = 'Supabase is not configured.';

export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY: string | undefined =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  return supabase;
}
