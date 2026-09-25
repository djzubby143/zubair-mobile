import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY if configured (bypassing client-level RLS to execute
 * secured RPCs like process_atomic_checkout), or falls back to anon key.
 */
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xzuohdaromspqydxhlkh.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
