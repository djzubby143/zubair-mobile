import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  });
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || "https://xzuohdaromspqydxhlkh.supabase.co";
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Anon Key present:", !!anonKey);
console.log("Service Role Key present in .env.local:", !!serviceRoleKey);

const anonClient = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("\n--- Testing call with anon client ---");
  const { data: anonData, error: anonError } = await anonClient.rpc("process_atomic_checkout", {
    p_order_id: "test-anon-1",
    p_order_number: "ZM-TEST01",
    p_customer_name: "Test Anon",
    p_customer_phone: "03001234567",
    p_customer_address: "Test Address",
    p_total_amount: 1,
    p_delivery_charges: 0,
    p_discount_amount: 0,
    p_payment_method: "cod",
    p_idempotency_key: "idem-test-anon-1",
    p_items: [{ id: "1", quantity: 1, price: 1 }],
  });

  console.log("Anon call error code:", anonError?.code);
  console.log("Anon call error message:", anonError?.message);
  console.log("Anon call data:", anonData);
}

run().catch((e) => console.error("Unhandled:", e));
