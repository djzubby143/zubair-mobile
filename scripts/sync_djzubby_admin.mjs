import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function syncAdmin() {
  console.log("Syncing djzubby super_admin account to Supabase customers...");
  try {
    const { data, error } = await supabase.from("customers").upsert(
      {
        id: "admin-djzubby-001",
        username: "djzubby",
        name: "Dj Zubby (Super Admin)",
        full_name: "Dj Zubby (Super Admin)",
        email: "djzubby@zubairmobile.com",
        phone: "03458032600",
        role: "super_admin",
        pricing_tier: "wholesale",
        city: "Gujranwala",
        password_hash: "$2b$10$jO/RtASQ.lHh435fYyrXtuoNh.Ahm7H3/EfCcdfr2EKl7Eb6pk9fm",
        password: "$2b$10$jO/RtASQ.lHh435fYyrXtuoNh.Ahm7H3/EfCcdfr2EKl7Eb6pk9fm",
        is_approved: true,
        status: "active",
      },
      { onConflict: "username" }
    );

    if (error) {
      console.warn("Supabase upsert warning:", error.message);
    } else {
      console.log("Successfully synced djzubby into Supabase customers!");
    }
  } catch (err) {
    console.warn("Notice: Local fallback active for djzubby:", err.message);
  }
}

syncAdmin();
