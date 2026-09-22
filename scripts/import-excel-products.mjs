import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSXModule from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const XLSX = XLSXModule.default || XLSXModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Load Environment Variables from .env.local
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xzuohdaromspqydxhlkh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL ya Key .env.local mein nahi mili!');
  process.exit(1);
}

const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`🔌 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Key Type: ${isServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY (RLS Bypass)' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function slugify(text) {
  let cleaned = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^side\s*key\s*[-–—]?\s*/i, '')
    .replace(/\s*side\s*key\s*$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `sidekey-${cleaned}`;
}

function extractModel(text) {
  return text
    .toString()
    .trim()
    .replace(/^side\s*key\s*[-–—]?\s*/i, '')
    .replace(/\s*side\s*key\s*$/i, '')
    .trim() || text.trim();
}

async function runImport() {
  console.log('\n=======================================================');
  console.log('📦 Zubair Mobile: Professional Product Excel Importer');
  console.log('=======================================================\n');

  // STEP 1: CREATE BACKUP
  console.log('💾 Step 1: Creating backup before import...');
  const backupDir = path.join(projectRoot, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let existingDbProducts = [];
  try {
    const { data: currentProducts, error: bkpErr } = await supabase
      .from('products')
      .select('*');
    if (!bkpErr && currentProducts) {
      existingDbProducts = currentProducts;
    }
  } catch (err) {
    console.warn('⚠️ Notice fetching remote products for backup:', err.message);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `products_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(existingDbProducts, null, 2), 'utf8');
  console.log(`✅ Backup successfully created at: ${backupFile} (${existingDbProducts.length} items recorded)`);

  // STEP 2: READ EXCEL FILE
  console.log('\n📖 Step 2: Reading Excel file...');
  let excelPath = path.join(projectRoot, 'Zubair_Mobile_Products_Upload.xlsx');
  if (!fs.existsSync(excelPath)) {
    excelPath = path.join(projectRoot, 'Zubair_Mobile_Side_Keys.xlsx');
  }

  console.log(`📁 File Source: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  console.log(`📋 Active Sheet: "${sheetName}"`);

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`📊 Total rows in Excel: ${rawRows.length}`);

  // STEP 3: CATEGORY SETUP
  console.log('\n🔍 Step 3: Checking Category "Side Keys"...');
  let categoryId = 'f1f0fb31-2b9b-4666-9149-ea669e417a8e';
  try {
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, slug')
      .or('slug.eq.side-keys,slug.eq.sidekey,name.ilike.%side key%')
      .limit(1);

    if (catData && catData.length > 0) {
      categoryId = catData[0].id;
      console.log(`✅ Category confirmed: "${catData[0].name}" (ID: ${categoryId})`);
    } else {
      console.log(`✅ Default Category ID assigned: ${categoryId}`);
    }
  } catch (e) {
    console.warn('⚠️ Category check notice:', e.message);
  }

  // STEP 4: SANITIZATION, PRICE SEPARATION & VALIDATION
  console.log('\n🧹 Step 4: Processing rows, keeping 3-tier prices separate...');

  const importedProducts = [];
  const skippedProducts = [];
  const duplicateProducts = [];
  const missingPriceProducts = [];

  const existingSlugMap = new Map();
  const existingSkuMap = new Map();
  const existingNameMap = new Map();

  // Populate maps from DB backup to prevent duplication
  existingDbProducts.forEach((p) => {
    if (p.slug) existingSlugMap.set(p.slug.toLowerCase(), p);
    if (p.sku) existingSkuMap.set(p.sku.toUpperCase(), p);
    if (p.name) existingNameMap.set(p.name.trim().toLowerCase(), p);
  });

  const currentSlugs = new Set(existingSlugMap.keys());
  const currentSkus = new Set(existingSkuMap.keys());

  rawRows.forEach((row, index) => {
    const rawName = (row['name'] || row['Item Name'] || row['Item name*'] || '').toString().trim();

    // 1. Check for skipped rows (empty name)
    if (!rawName) {
      skippedProducts.push({
        rowNumber: index + 2,
        reason: 'Empty product name',
        data: row,
      });
      return;
    }

    const model = extractModel(rawName);

    // 2. Duplicate Detection
    const normName = rawName.toLowerCase();
    if (existingNameMap.has(normName)) {
      duplicateProducts.push({
        name: rawName,
        rowNumber: index + 2,
        reason: `Product with name "${rawName}" already exists in database`,
        existingId: existingNameMap.get(normName)?.id,
      });
      return;
    }

    // 3. Keep all prices strictly separate and independent (decimals allowed)
    const rawWholesale = row['wholesale_price'] ?? row['Sale Price (PKR)'] ?? row['Sale price'];
    const wholesale_price = rawWholesale !== undefined && rawWholesale !== null && !isNaN(Number(rawWholesale))
      ? parseFloat(rawWholesale)
      : null;

    const rawTechnician = row['technician_price'] ?? row['Technician Price (PKR)'] ?? row['Technician price'];
    const technician_price = rawTechnician !== undefined && rawTechnician !== null && !isNaN(Number(rawTechnician))
      ? parseFloat(rawTechnician)
      : null;

    const rawRetail = row['retail_price'] ?? row['Retail Price (PKR)'] ?? row['Retail price'];
    const retail_price = rawRetail !== undefined && rawRetail !== null && !isNaN(Number(rawRetail))
      ? parseFloat(rawRetail)
      : null;

    const rawPurchase = row['purchase_price'] ?? row['Purchase Price (PKR)'] ?? row['Purchase price'];
    const purchase_price = rawPurchase !== undefined && rawPurchase !== null && !isNaN(Number(rawPurchase))
      ? parseFloat(rawPurchase)
      : null;

    // Report missing or zero price products separately (DO NOT auto-replace with 75)
    if (wholesale_price === null || wholesale_price <= 0) {
      missingPriceProducts.push({
        name: rawName,
        rowNumber: index + 2,
        wholesale_price: wholesale_price ?? 'MISSING',
        technician_price: technician_price ?? 'N/A',
        retail_price: retail_price ?? 'N/A',
      });
    }

    // 4. Stock quantity sanitization (negative to 0)
    const rawStock = parseInt(row['stock_quantity'] ?? row['Current Stock'] ?? row['Current stock quantity'] ?? 0, 10);
    const stock_quantity = isNaN(rawStock) || rawStock < 0 ? 0 : rawStock;

    // 5. Min Order Quantity
    const rawMoq = parseInt(row['min_order_quantity'] ?? 1, 10);
    const min_order_quantity = isNaN(rawMoq) || rawMoq < 1 ? 1 : rawMoq;

    // 6. Generate unique slug
    let baseSlug = slugify(rawName);
    let finalSlug = baseSlug;
    let sCount = 1;
    while (currentSlugs.has(finalSlug)) {
      sCount++;
      finalSlug = `${baseSlug}-${sCount}`;
    }
    currentSlugs.add(finalSlug);

    // 7. Generate unique SKU
    let rawSku = (row['sku'] || row['SKU / Item Code'] || row['Item code'] || '').toString().trim();
    let baseSku = rawSku
      ? rawSku.toUpperCase().replace(/[^A-Z0-9-]/g, '')
      : `ZB-SDK-${model.toUpperCase().replace(/[^A-Z0-9]/g, '-') || String(index + 1).padStart(3, '0')}`;

    let finalSku = baseSku;
    let kCount = 1;
    while (currentSkus.has(finalSku)) {
      kCount++;
      finalSku = `${baseSku}-${kCount}`;
    }
    currentSkus.add(finalSku);

    // 8. Formatted product object
    const productRecord = {
      name: rawName,
      slug: finalSlug,
      sku: finalSku,
      category_id: categoryId,
      price: wholesale_price !== null ? wholesale_price : 0, // Base wholesale trade price
      wholesale_price: wholesale_price !== null ? wholesale_price : 0,
      technician_price: technician_price !== null ? technician_price : undefined,
      retail_price: retail_price !== null ? retail_price : undefined,
      purchase_price: purchase_price !== null && purchase_price > 0 ? purchase_price : undefined,
      stock_quantity: stock_quantity,
      min_order_quantity: min_order_quantity,
      short_description: (row['short_description'] || `Genuine mobile replacement side key / button for ${model}.`).toString().trim(),
      description: `Original equipment mobile phone side volume and power key button for ${model}. Made of durable OEM material, precision molded for exact tactile click response.`,
      image_url: row['image_url'] ? String(row['image_url']).trim() : '/images/sidekey-placeholder.svg',
      is_active: true,
      featured: false,
    };

    importedProducts.push(productRecord);
  });

  // STEP 5: BATCH INSERT
  console.log(`\n⚡ Step 5: Preparing to insert ${importedProducts.length} new unique products...`);
  const chunkSize = 50;
  let totalUploaded = 0;
  const insertErrors = [];

  for (let i = 0; i < importedProducts.length; i += chunkSize) {
    const chunk = importedProducts.slice(i, i + chunkSize);
    const batchNum = Math.floor(i / chunkSize) + 1;
    const totalBatches = Math.ceil(importedProducts.length / chunkSize);

    try {
      const payload = chunk.map((item) => {
        const copy = { ...item };
        if (copy.purchase_price === undefined) delete copy.purchase_price;
        if (copy.technician_price === undefined) delete copy.technician_price;
        if (copy.retail_price === undefined) delete copy.retail_price;
        return copy;
      });

      let { data, error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'slug' })
        .select('id');

      if (error && error.message && (
        error.message.includes('min_order_quantity') ||
        error.message.includes('technician_price') ||
        error.message.includes('retail_price') ||
        error.message.includes('purchase_price')
      )) {
        const fallbackPayload = payload.map((p) => {
          const c = { ...p };
          delete c.min_order_quantity;
          delete c.technician_price;
          delete c.retail_price;
          delete c.purchase_price;
          return c;
        });
        const retryRes = await supabase
          .from('products')
          .upsert(fallbackPayload, { onConflict: 'slug' })
          .select('id');
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        insertErrors.push({ batch: batchNum, message: error.message });
        console.warn(`⚠️ Batch ${batchNum}/${totalBatches} notice:`, error.message);
      } else {
        totalUploaded += data ? data.length : chunk.length;
        console.log(`✅ Batch ${batchNum}/${totalBatches} synced successfully (${chunk.length} items).`);
      }
    } catch (err) {
      insertErrors.push({ batch: batchNum, message: err.message });
      console.error(`❌ Batch ${batchNum}/${totalBatches} exception:`, err.message);
    }
  }

  // STEP 6: UPDATE STOREFRONT CATALOG CACHE
  // Update lib/sidekeysData.ts with the fresh imported products
  const formattedCatalog = importedProducts.map((p) => ({
    id: `p-sdk-${p.slug}`,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    technician_price: p.technician_price,
    retail_price: p.retail_price,
    purchase_price: p.purchase_price,
    stock_quantity: p.stock_quantity,
    min_order_quantity: p.min_order_quantity,
    short_description: p.short_description,
    category: {
      id: categoryId,
      name: 'Side Keys',
      slug: 'side-keys',
    },
    image_url: '/images/sidekey-placeholder.svg',
    is_active: true,
    featured: false,
  }));

  const catalogFilePath = path.join(projectRoot, 'lib', 'sidekeysData.ts');
  const catalogCode = `// Auto-generated Side Keys data (${formattedCatalog.length} items)
import { Product } from "./types";

export const SIDE_KEY_PRODUCTS: Product[] = ${JSON.stringify(formattedCatalog, null, 2)};
`;
  fs.writeFileSync(catalogFilePath, catalogCode, 'utf8');
  console.log(`\n✨ Storefront catalog synced at: ${catalogFilePath}`);

  // Generate idempotent SQL backup file
  const sqlFilePath = path.join(projectRoot, 'supabase', 'import_products.sql');
  const sqlContent = generateSqlBackup(categoryId, importedProducts);
  fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');
  console.log(`📄 Supabase SQL query script created at: ${sqlFilePath}`);

  // STEP 7: PRINT FINAL IMPORT SUMMARY
  console.log('\n=======================================================');
  console.log('📊 FINAL IMPORT SUMMARY REPORT');
  console.log('=======================================================');
  console.log(`Total Rows in Excel File:        ${rawRows.length}`);
  console.log(`Total Products Prepared/Imported: ${importedProducts.length}`);
  console.log(`Skipped Products (Empty Name):   ${skippedProducts.length}`);
  console.log(`Duplicate Products Detected:     ${duplicateProducts.length}`);
  console.log(`Missing / Zero Price Products:   ${missingPriceProducts.length}`);
  console.log(`Remote DB Batch Errors:          ${insertErrors.length}`);
  console.log('=======================================================');

  if (skippedProducts.length > 0) {
    console.log('\n⚠️ SKIPPED ROWS (Empty Names):');
    skippedProducts.forEach((s) => console.log(`  - Row ${s.rowNumber}: ${s.reason}`));
  }

  if (duplicateProducts.length > 0) {
    console.log('\n⚠️ DUPLICATE PRODUCTS DETECTED:');
    duplicateProducts.forEach((d) => console.log(`  - Row ${d.rowNumber}: "${d.name}" (${d.reason})`));
  }

  if (missingPriceProducts.length > 0) {
    console.log('\n🔍 MISSING / ZERO PRICE PRODUCTS (Reported Separately as requested):');
    missingPriceProducts.forEach((m) =>
      console.log(`  - Row ${m.rowNumber}: "${m.name}" | Wholesale: ${m.wholesale_price} | Tech: ${m.technician_price} | Retail: ${m.retail_price}`)
    );
  }

  console.log('\n🎉 Import execution completed!\n');
}

function generateSqlBackup(categoryId, products) {
  let sql = `-- ==========================================================\n`;
  sql += `-- Zubair Mobile - Import Products SQL Script\n`;
  sql += `-- ==========================================================\n\n`;

  sql += `INSERT INTO public.categories (id, name, slug, description)\n`;
  sql += `VALUES ('${categoryId}', 'Side Keys', 'side-keys', 'Original mobile power and volume side key buttons for Samsung, Vivo, Infinix, Oppo, Tecno, Redmi, and Itel.')\n`;
  sql += `ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;\n\n`;

  sql += `INSERT INTO public.products (name, slug, sku, category_id, price, wholesale_price, technician_price, retail_price, purchase_price, stock_quantity, short_description, image_url, is_active, featured)\nVALUES\n`;

  const values = products.map((p) => {
    const esc = (str) => String(str).replace(/'/g, "''");
    const techVal = p.technician_price !== undefined && p.technician_price !== null ? p.technician_price : 'NULL';
    const retVal = p.retail_price !== undefined && p.retail_price !== null ? p.retail_price : 'NULL';
    const purVal = p.purchase_price !== undefined && p.purchase_price !== null ? p.purchase_price : 'NULL';
    return `  ('${esc(p.name)}', '${esc(p.slug)}', '${esc(p.sku)}', '${categoryId}', ${p.price}, ${p.wholesale_price ?? p.price}, ${techVal}, ${retVal}, ${purVal}, ${p.stock_quantity}, '${esc(p.short_description)}', '${p.image_url || '/images/sidekey-placeholder.svg'}', true, false)`;
  });

  sql += values.join(',\n');
  sql += `\nON CONFLICT (slug) DO UPDATE SET\n`;
  sql += `  name = EXCLUDED.name,\n`;
  sql += `  price = EXCLUDED.price,\n`;
  sql += `  wholesale_price = EXCLUDED.wholesale_price,\n`;
  sql += `  technician_price = EXCLUDED.technician_price,\n`;
  sql += `  retail_price = EXCLUDED.retail_price,\n`;
  sql += `  purchase_price = EXCLUDED.purchase_price,\n`;
  sql += `  stock_quantity = EXCLUDED.stock_quantity,\n`;
  sql += `  short_description = EXCLUDED.short_description,\n`;
  sql += `  image_url = EXCLUDED.image_url,\n`;
  sql += `  is_active = true;\n`;

  return sql;
}

runImport().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
