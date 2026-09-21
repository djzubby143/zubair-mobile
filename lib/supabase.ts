import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xzuohdaromspqydxhlkh.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dW9oZGFyb21zcHF5ZHhobGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODI2MzgsImV4cCI6MjEwNTU1ODYzOH0.BLjmk9kWAAn3Dswu9HJ8jwquugEYfaV-R8l-ew7qrL0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
