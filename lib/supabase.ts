import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    console.error(
      "Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

// Uses environment variables from .env.local (development) or Vercel dashboard (production).
// Uses a dummy placeholder only during headless CI build phases if env vars have not been injected yet.
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
