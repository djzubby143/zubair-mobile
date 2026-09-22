import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();

// Load Environment Variables from .env.local
function loadEnv(): Record<string, string> {
  const envPath = path.join(projectRoot, ".env.local");
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (!env[k.trim()]) {
          env[k.trim()] = val;
        }
      }
    });
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://xzuohdaromspqydxhlkh.supabase.co";
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const isServiceRole = !!env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`🔌 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using Key Type: ${isServiceRole ? "SUPABASE_SERVICE_ROLE_KEY (Bypasses RLS)" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Helper for model name extraction
function extractModelName(rawName: string): string {
  let cleaned = rawName.trim();
  cleaned = cleaned.replace(/^side\s*key\s*[-–—]?\s*/i, "");
  cleaned = cleaned.replace(/\s*side\s*key\s*$/i, "");
  return cleaned.trim() || rawName.trim();
}

// Generate unique slug
function createSlug(base: string, existingSlugs: Set<string>): string {
  let slug = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug.startsWith("sidekey-")) {
    slug = `sidekey-${slug}`;
  }
  let finalSlug = slug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) {
    counter++;
    finalSlug = `${slug}-${counter}`;
  }
  existingSlugs.add(finalSlug);
  return finalSlug;
}

// Generate unique SKU
function createSku(modelName: string, index: number, existingSkus: Set<string>): string {
  let cleaned = modelName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let baseSku = `ZB-SDK-${cleaned || String(index + 1).padStart(3, "0")}`;
  let finalSku = baseSku;
  let counter = 1;
  while (existingSkus.has(finalSku)) {
    counter++;
    finalSku = `${baseSku}-${counter}`;
  }
  existingSkus.add(finalSku);
  return finalSku;
}

interface ProductSeed {
  name: string;
  slug: string;
  sku: string;
  category_id: string | null;
  price: number;
  purchase_price?: number;
  stock_quantity: number;
  short_description: string;
  description: string;
  is_active: boolean;
  featured: boolean;
}

async function main() {
  console.log("\n=======================================================");
  console.log("🚀 Zubair Mobile - Side Keys Database Seeder");
  console.log("=======================================================\n");

  // Step 1: Ensure Category Setup
  console.log("📁 Step 1: Checking and ensuring 'Side Keys' category...");
  let categoryId: string | null = null;

  try {
    const { data: existingCats } = await supabase
      .from("categories")
      .select("id, name, slug")
      .or("slug.eq.side-keys,slug.eq.sidekey,name.ilike.%side key%");

    if (existingCats && existingCats.length > 0) {
      const match = existingCats.find((c) => c.slug === "side-keys") || existingCats[0];
      categoryId = match.id;
      console.log(`✅ Category verified in database: "${match.name}" (Slug: ${match.slug}, ID: ${categoryId})`);
    } else {
      console.log("ℹ️ Category 'Side Keys' not found. Creating it now...");
      const { data: newCat, error: catCreateErr } = await supabase
        .from("categories")
        .upsert(
          {
            name: "Side Keys",
            slug: "side-keys",
            description:
              "Original mobile power and volume side key buttons for Samsung, Vivo, Infinix, Oppo, Tecno, Redmi, and Itel.",
          },
          { onConflict: "slug" }
        )
        .select()
        .single();

      if (catCreateErr) {
        console.warn("⚠️ Notice inserting category into Supabase:", catCreateErr.message);
        categoryId = "f1f0fb31-2b9b-4666-9149-ea669e417a8e";
      } else if (newCat) {
        categoryId = newCat.id;
        console.log(`✅ Created 'Side Keys' category with ID: ${categoryId}`);
      }
    }
  } catch (err: unknown) {
    const e = err as Error;
    console.warn("⚠️ Category check notice:", e.message);
    categoryId = "f1f0fb31-2b9b-4666-9149-ea669e417a8e";
  }

  // Step 2: Read Excel File
  const excelPath = path.join(projectRoot, "Zubair_Mobile_Side_Keys.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found at: ${excelPath}`);
    process.exit(1);
  }

  console.log(`\n📖 Step 2: Reading Excel from: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames.includes("Side Keys Clean")
    ? "Side Keys Clean"
    : workbook.SheetNames.includes("Original Format (Vyapar)")
    ? "Original Format (Vyapar)"
    : workbook.SheetNames[0];

  console.log(`📋 Active Sheet: "${sheetName}"`);
  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[];
  console.log(`📊 Total raw records found in Excel: ${rawRows.length}`);

  // Step 3: Data Sanitization & Mapping
  console.log("\n🧹 Step 3: Sanitizing data and mapping products schema...");
  const existingSlugs = new Set<string>();
  const existingSkus = new Set<string>();

  const sanitizedProducts: ProductSeed[] = rawRows.map((row, idx) => {
    const rawName = String(row["Item Name"] || row["Item name*"] || row["name"] || "").trim();
    const model = extractModelName(rawName);

    const rawPrice = row["Sale Price (PKR)"] ?? row["Sale price"] ?? row["price"] ?? 75;
    const price = Math.max(0, Math.round(Number(rawPrice) || 75));

    const rawPurchasePrice = row["Purchase Price (PKR)"] ?? row["Purchase price"] ?? row["purchase_price"] ?? 0;
    const purchasePrice = Math.max(0, Math.round(Number(rawPurchasePrice) || 0));

    const rawStock = row["Current Stock"] ?? row["Current stock quantity"] ?? row["stock_quantity"] ?? 0;
    const stockQuantity = Math.max(0, parseInt(String(rawStock), 10) || 0);

    const slug = createSlug(model, existingSlugs);
    const sku = createSku(model, idx, existingSkus);

    return {
      name: rawName || `SideKey ${model}`,
      slug,
      sku,
      category_id: categoryId,
      price,
      purchase_price: purchasePrice > 0 ? purchasePrice : undefined,
      stock_quantity: stockQuantity,
      short_description: `Genuine mobile replacement side key / button for ${model}.`,
      description: `Original equipment mobile phone side volume and power key button for ${model}. Made of durable OEM material, precision molded for exact tactile click response.`,
      is_active: true,
      featured: false,
    };
  });

  console.log(`✅ Successfully sanitized and prepared ${sanitizedProducts.length} items.`);

  // Step 4: Batch Upsert into Supabase
  const BATCH_SIZE = 50;
  console.log(`\n⚡ Step 4: Batch upserting ${sanitizedProducts.length} items (chunk size: ${BATCH_SIZE}) onConflict: 'slug'...`);

  let totalInserted = 0;
  let totalFailed = 0;
  let rlsBlocked = false;

  for (let i = 0; i < sanitizedProducts.length; i += BATCH_SIZE) {
    const batch = sanitizedProducts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sanitizedProducts.length / BATCH_SIZE);

    try {
      const payload = batch.map((item) => {
        const copy: Record<string, unknown> = { ...item };
        if (copy.purchase_price === undefined) delete copy.purchase_price;
        return copy;
      });

      const { data, error } = await supabase
        .from("products")
        .upsert(payload, { onConflict: "slug" })
        .select("id");

      if (error) {
        console.warn(`⚠️ Batch ${batchNum}/${totalBatches} error:`, error.message);
        if (error.code === "42501" || error.message.includes("row-level security")) {
          rlsBlocked = true;
        }

        if (error.message.includes("purchase_price")) {
          const fallbackPayload = payload.map((p) => {
            const c = { ...p };
            delete c.purchase_price;
            return c;
          });
          const retry = await supabase
            .from("products")
            .upsert(fallbackPayload, { onConflict: "slug" });
          if (retry.error) {
            console.error(`❌ Batch ${batchNum}/${totalBatches} fallback failed:`, retry.error.message);
            totalFailed += batch.length;
          } else {
            console.log(`✅ Batch ${batchNum}/${totalBatches} (${batch.length} items) upserted successfully via fallback!`);
            totalInserted += batch.length;
          }
        } else {
          totalFailed += batch.length;
        }
      } else {
        const count = data ? data.length : batch.length;
        console.log(`✅ Batch ${batchNum}/${totalBatches} (${count} items) upserted successfully!`);
        totalInserted += count;
      }
    } catch (batchErr: unknown) {
      const e = batchErr as Error;
      console.error(`❌ Batch ${batchNum}/${totalBatches} exception:`, e.message);
      totalFailed += batch.length;
    }
  }

  // Generate SQL seed script as an idempotent backup
  const sqlFile = path.join(projectRoot, "supabase", "seed_sidekeys.sql");
  const sqlContent = generateSqlSeed(categoryId, sanitizedProducts);
  fs.writeFileSync(sqlFile, sqlContent, "utf-8");
  console.log(`\n📄 Generated Supabase SQL backup script at: ${sqlFile}`);

  console.log("\n=======================================================");
  console.log("📊 SEED SUMMARY REPORT");
  console.log("=======================================================");
  console.log(`Total Records Found: ${sanitizedProducts.length}`);
  console.log(`Category: Side Keys (ID: ${categoryId})`);
  console.log(`Batches Successfully Inserted: ${totalInserted} items`);
  console.log(`Batches Failed / Pending: ${totalFailed} items`);

  if (rlsBlocked) {
    console.log("\n⚠️ [RLS Notice]: Supabase Row Level Security (RLS) is active for anon key.");
    console.log("   To allow direct remote writing or execute with service role:");
    console.log("   Option A: Add SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.log("   Option B: Paste the generated SQL script 'supabase/seed_sidekeys.sql' into the Supabase SQL Editor.");
  }

  console.log("=======================================================\n");
}

function generateSqlSeed(categoryId: string | null, products: ProductSeed[]): string {
  let sql = `-- ==========================================================\n`;
  sql += `-- Zubair Mobile - Seed 239 Side Key Items\n`;
  sql += `-- Idempotent Batch Insert (on conflict slug do update)\n`;
  sql += `-- ==========================================================\n\n`;

  sql += `-- 1. Ensure Category Exists\n`;
  sql += `INSERT INTO public.categories (name, slug, description)\n`;
  sql += `VALUES ('Side Keys', 'side-keys', 'Original mobile power and volume side key buttons for Samsung, Vivo, Infinix, Oppo, Tecno, Redmi, and Itel.')\n`;
  sql += `ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;\n\n`;

  sql += `-- 2. Insert / Update Products\n`;
  sql += `INSERT INTO public.products (name, slug, sku, category_id, price, stock_quantity, short_description, is_active, featured)\nVALUES\n`;

  const values = products.map((p) => {
    const esc = (str: string) => String(str).replace(/'/g, "''");
    const catVal = categoryId ? `'${categoryId}'` : `(SELECT id FROM public.categories WHERE slug = 'side-keys' LIMIT 1)`;
    return `  ('${esc(p.name)}', '${esc(p.slug)}', '${esc(p.sku)}', ${catVal}, ${p.price}, ${p.stock_quantity}, '${esc(p.short_description)}', true, false)`;
  });

  sql += values.join(",\n");
  sql += `\nON CONFLICT (slug) DO UPDATE SET\n`;
  sql += `  name = EXCLUDED.name,\n`;
  sql += `  price = EXCLUDED.price,\n`;
  sql += `  stock_quantity = EXCLUDED.stock_quantity,\n`;
  sql += `  short_description = EXCLUDED.short_description,\n`;
  sql += `  is_active = true;\n`;

  return sql;
}

main().catch((err) => {
  console.error("Fatal Seeder Error:", err);
  process.exit(1);
});
