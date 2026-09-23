import { resolveUserTier, sanitizeProductForTier, sanitizeProductListForTier } from "../lib/pricingSecurity";
import { getEffectiveProductPrice } from "../lib/auth";
import { DEFAULT_CATALOG_PRODUCTS } from "../lib/products";
import { supabase } from "../lib/supabase";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("=================================================");
  console.log("--- 1. Testing Role & Tier Resolution ---");
  console.log("=================================================");

  const guestTier = resolveUserTier(null);
  console.log("Guest tier resolved:", guestTier);
  if (guestTier !== "guest") throw new Error(`Expected guest, got ${guestTier}`);

  const retailTier = resolveUserTier({
    id: "c1",
    username: "retailuser",
    role: "retail",
    pricing_tier: "retail",
  });
  console.log("Retail user resolved:", retailTier);
  if (retailTier !== "retail") throw new Error(`Expected retail, got ${retailTier}`);

  const genericCustTier = resolveUserTier({
    id: "c2",
    username: "gencust",
    role: "customer",
  });
  console.log("Generic customer resolved:", genericCustTier);
  if (genericCustTier !== "retail") throw new Error(`Expected customer to default to retail, got ${genericCustTier}`);

  const wholesaleTier = resolveUserTier({
    id: "c3",
    username: "wholesaleuser",
    role: "wholesale",
    pricing_tier: "wholesale",
  });
  console.log("Wholesale user resolved:", wholesaleTier);
  if (wholesaleTier !== "wholesale") throw new Error(`Expected wholesale, got ${wholesaleTier}`);

  const technicianTier = resolveUserTier({
    id: "c4",
    username: "technicianuser",
    role: "technician",
    pricing_tier: "technician",
  });
  console.log("Technician user resolved:", technicianTier);
  if (technicianTier !== "technician") throw new Error(`Expected technician, got ${technicianTier}`);

  const adminTier = resolveUserTier({
    id: "admin1",
    username: "admin",
    role: "admin",
  });
  console.log("Admin user resolved:", adminTier);
  if (adminTier !== "admin") throw new Error(`Expected admin, got ${adminTier}`);

  console.log("\n=================================================");
  console.log("--- 2. Testing Strict Pricing Redaction & Security ---");
  console.log("=================================================");

  const sampleProduct = {
    id: "test-prod-1",
    name: "SAMSUNG A12 CHARGING FLEX WITH IC",
    slug: "samsung-a12-charging-flex-with-ic",
    sku: "ZB-FLX-SA12",
    price: 350,
    wholesale_price: 350,
    technician_price: 392,
    retail_price: 438,
    purchase_price: 240,
    stock_quantity: 65,
    min_order_quantity: 5,
    is_active: true,
  };

  // Case A: Guest
  const guestSanitized = sanitizeProductForTier(sampleProduct, "guest");
  console.log("\n[Guest Sanitized Product]:", {
    price: guestSanitized.price,
    retail_price: guestSanitized.retail_price,
    wholesale_price: guestSanitized.wholesale_price,
    technician_price: guestSanitized.technician_price,
    purchase_price: guestSanitized.purchase_price,
  });
  if (guestSanitized.price !== 438 || guestSanitized.retail_price !== 438) {
    throw new Error("Guest must only receive retail_price 438");
  }
  if (guestSanitized.wholesale_price !== undefined || guestSanitized.technician_price !== undefined || guestSanitized.purchase_price !== undefined) {
    throw new Error("Guest must NOT have wholesale_price, technician_price, or purchase_price exposed!");
  }

  // Case B: Retail Customer
  const retailSanitized = sanitizeProductForTier(sampleProduct, "retail");
  console.log("\n[Retail Customer Sanitized Product]:", {
    price: retailSanitized.price,
    retail_price: retailSanitized.retail_price,
    wholesale_price: retailSanitized.wholesale_price,
    technician_price: retailSanitized.technician_price,
    purchase_price: retailSanitized.purchase_price,
  });
  if (retailSanitized.price !== 438 || retailSanitized.retail_price !== 438) {
    throw new Error("Retail user must only receive retail_price 438");
  }
  if (retailSanitized.wholesale_price !== undefined || retailSanitized.technician_price !== undefined || retailSanitized.purchase_price !== undefined) {
    throw new Error("Retail user must NOT have wholesale_price, technician_price, or purchase_price exposed!");
  }

  // Case B2: Retail Customer with raw unconfigured product (only raw wholesale price 350)
  const rawProduct = {
    id: "raw-1",
    name: "Raw Part Without Explicit Retail",
    slug: "raw-part",
    sku: "RAW-1",
    price: 350,
    stock_quantity: 10,
    is_active: true,
  };
  const rawRetailSanitized = sanitizeProductForTier(rawProduct, "retail");
  console.log("\n[Retail Customer with Raw Product]:", {
    price: rawRetailSanitized.price,
    retail_price: rawRetailSanitized.retail_price,
    wholesale_price: rawRetailSanitized.wholesale_price,
  });
  if (rawRetailSanitized.price === 350 || rawRetailSanitized.retail_price === 350) {
    throw new Error("CRITICAL LEAK: Retail user was given raw wholesale price 350!");
  }
  if (rawRetailSanitized.price <= 350) {
    throw new Error("CRITICAL: Retail price must be strictly greater than wholesale price!");
  }
  if (rawRetailSanitized.wholesale_price !== undefined) {
    throw new Error("CRITICAL LEAK: wholesale_price property must be undefined for retail user!");
  }

  // Case C: Wholesale Customer
  const wholesaleSanitized = sanitizeProductForTier(sampleProduct, "wholesale");
  console.log("\n[Wholesale Customer Sanitized Product]:", {
    price: wholesaleSanitized.price,
    retail_price: wholesaleSanitized.retail_price,
    wholesale_price: wholesaleSanitized.wholesale_price,
    technician_price: wholesaleSanitized.technician_price,
    purchase_price: wholesaleSanitized.purchase_price,
  });
  if (wholesaleSanitized.price !== 350 || wholesaleSanitized.wholesale_price !== 350) {
    throw new Error("Wholesale user must receive wholesale_price 350");
  }
  if (wholesaleSanitized.technician_price !== undefined || wholesaleSanitized.purchase_price !== undefined || wholesaleSanitized.retail_price !== undefined) {
    throw new Error("Wholesale user must NOT have technician_price, retail_price, or purchase_price exposed!");
  }

  // Case D: Technician Customer
  const techSanitized = sanitizeProductForTier(sampleProduct, "technician");
  console.log("\n[Technician Customer Sanitized Product]:", {
    price: techSanitized.price,
    retail_price: techSanitized.retail_price,
    wholesale_price: techSanitized.wholesale_price,
    technician_price: techSanitized.technician_price,
    purchase_price: techSanitized.purchase_price,
  });
  if (techSanitized.price !== 392 || techSanitized.technician_price !== 392) {
    throw new Error("Technician user must receive technician_price 392");
  }
  if (techSanitized.wholesale_price !== undefined || techSanitized.purchase_price !== undefined || techSanitized.retail_price !== undefined) {
    throw new Error("Technician user must NOT have wholesale_price, retail_price, or purchase_price exposed!");
  }

  // Case E: Admin
  const adminSanitized = sanitizeProductForTier(sampleProduct, "admin");
  console.log("\n[Admin Sanitized Product]:", {
    price: adminSanitized.price,
    retail_price: adminSanitized.retail_price,
    wholesale_price: adminSanitized.wholesale_price,
    technician_price: adminSanitized.technician_price,
    purchase_price: adminSanitized.purchase_price,
  });
  if (
    adminSanitized.wholesale_price !== 350 ||
    adminSanitized.technician_price !== 392 ||
    adminSanitized.retail_price !== 438 ||
    adminSanitized.purchase_price !== 240
  ) {
    throw new Error("Admin must receive all 4 prices intact!");
  }

  console.log("\n=================================================");
  console.log("--- 3. Testing getEffectiveProductPrice helper ---");
  console.log("=================================================");

  const guestEff = getEffectiveProductPrice(sampleProduct, null);
  console.log("Guest Effective Price:", guestEff.price, "Active Tier:", guestEff.activeTier);
  if (guestEff.price !== 438 || guestEff.activeTier !== "retail") throw new Error("Guest effective price mismatch");

  const retailEff = getEffectiveProductPrice(sampleProduct, { id: "c1", username: "retailuser", pricing_tier: "retail" });
  console.log("Retail User Effective Price:", retailEff.price, "Active Tier:", retailEff.activeTier);
  if (retailEff.price !== 438 || retailEff.activeTier !== "retail") throw new Error("Retail user effective price mismatch");

  const techEff = getEffectiveProductPrice(sampleProduct, { id: "c4", username: "technicianuser", pricing_tier: "technician" });
  console.log("Technician Effective Price:", techEff.price, "Active Tier:", techEff.activeTier);
  if (techEff.price !== 392 || techEff.activeTier !== "technician") throw new Error("Technician effective price mismatch");

  const wholesaleEff = getEffectiveProductPrice(sampleProduct, { id: "c3", username: "wholesaleuser", pricing_tier: "wholesale" });
  console.log("Wholesale Effective Price:", wholesaleEff.price, "Active Tier:", wholesaleEff.activeTier);
  if (wholesaleEff.price !== 350 || wholesaleEff.activeTier !== "wholesale") throw new Error("Wholesale effective price mismatch");

  const adminEff = getEffectiveProductPrice(sampleProduct, { id: "admin", username: "admin", role: "admin" });
  console.log("Admin Effective Price (Wholesale Base):", adminEff.price, "Can see tech:", adminEff.canSeeTechnicianRate, "Can see ws:", adminEff.canSeeWholesaleRate);
  if (!adminEff.canSeeTechnicianRate || !adminEff.canSeeWholesaleRate) throw new Error("Admin must see all rates");

  console.log("\n=================================================");
  console.log("--- 4. Seeding Users to Supabase (if connected) ---");
  console.log("=================================================");

  try {
    const rawUsers = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/customer_users.json"), "utf8"));
    console.log(`Found ${rawUsers.length} users to sync.`);
    for (const u of rawUsers) {
      const { data, error } = await supabase.from("customers").upsert([
        {
          username: u.username.toLowerCase(),
          password: u.password,
          full_name: u.full_name,
          shop_name: u.shop_name,
          phone: u.phone,
          city: u.city,
          address: u.address,
          role: u.role,
          status: u.status,
          pricing_tier: u.pricing_tier,
          notes: u.notes,
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: "username" });
      if (error) {
        console.warn(`Supabase upsert notice for ${u.username}:`, error.message);
      } else {
        console.log(`Successfully synced ${u.username} (${u.pricing_tier}) to Supabase customers.`);
      }
    }
  } catch (err: any) {
    console.warn("Supabase customer sync warning:", err?.message || err);
  }

  console.log("\n>>> ALL PRICING SECURITY AND VISIBILITY TESTS PASSED! <<<");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
