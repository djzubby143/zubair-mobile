import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as XLSXModule from 'xlsx';
import dotenv from 'dotenv';

const XLSX = XLSXModule.default || XLSXModule;

// 1. Load Environment Variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Agar SUPABASE_SERVICE_ROLE_KEY hai to woh behtar hai, warna anon key use karega
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL ya Key .env.local mein nahi mili!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runSeed() {
  console.log('🚀 Zubair Mobile: Side Keys Seeding Process Shuru Ho Raha Hai...\n');

  // 2. Read Excel File
  const filePath = path.resolve(process.cwd(), 'Zubair_Mobile_Side_Keys.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Excel file nahi mili path par: ${filePath}`);
    console.error('Kripya ensure karein ke "Zubair_Mobile_Side_Keys.xlsx" project ke main root folder mein maujood hai.');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.includes('Side Keys Clean') 
    ? 'Side Keys Clean' 
    : workbook.SheetNames[0];

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`📦 Excel read successful! Sheet "${sheetName}" se kul ${rawRows.length} items mile.`);

  // 3. Ensure 'Side Keys' Category exists in Database
  console.log('🔍 Checking Category: Side Keys...');
  const { data: existingCat, error: catFetchError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', 'side-keys')
    .maybeSingle();

  if (catFetchError) {
    console.error('❌ Category fetch karte waqt error:', catFetchError.message);
    process.exit(1);
  }

  let categoryId = existingCat?.id;

  if (!categoryId) {
    // Check if sidekey exists as fallback
    const { data: fallbackCat } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', 'sidekey')
      .maybeSingle();

    if (fallbackCat) {
      categoryId = fallbackCat.id;
      console.log(`✅ Category "Sidekey" pehle se database mein maujood hai. ID: ${categoryId}`);
    } else {
      console.log('➕ Category "Side Keys" create ki ja rahi hai...');
      const { data: newCat, error: catCreateError } = await supabase
        .from('categories')
        .insert([
          {
            name: 'Side Keys',
            slug: 'side-keys',
            description: 'Original mobile power and volume side key buttons for Samsung, Vivo, Infinix, Oppo, Tecno, Redmi, and Itel.'
          }
        ])
        .select('id')
        .single();

      if (catCreateError) {
        console.error('❌ Category create karte waqt error:', catCreateError.message);
        console.log('💡 Note: RLS active hone ki wajah se direct anon insert block ho sakta hai.');
        categoryId = 'f1f0fb31-2b9b-4666-9149-ea669e417a8e';
      } else {
        categoryId = newCat.id;
        console.log(`✅ Category create ho gayi! ID: ${categoryId}`);
      }
    }
  } else {
    console.log(`✅ Category pehle se maujood hai. ID: ${categoryId}`);
  }

  // 4. Data Transform aur Sanitize Karna
  const formattedProducts = rawRows.map((row, index) => {
    const name = (row['Item Name'] || row['Item name*'] || '').toString().trim();
    const cleanSlug = slugify(name);
    const sku = (row['SKU / Item Code'] || row['Item code'] || `ZB-SDK-${cleanSlug.slice(0, 10).toUpperCase()}-${index + 1}`).toString().trim();
    
    // Price aur Stock clean karna
    const rawPrice = parseFloat(row['Sale Price (PKR)'] || row['Sale price'] || 0);
    const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;

    const rawStock = parseInt(row['Current Stock'] || row['Current stock quantity'] || 0, 10);
    // Negative numbers ko safely 0 set karna
    const stock_quantity = isNaN(rawStock) || rawStock < 0 ? 0 : rawStock;

    const short_description = row['Short Description'] || 
      `Genuine mobile replacement side key / button for ${name.replace(/side\s*key/gi, '').trim()}.`;

    return {
      name,
      slug: cleanSlug,
      sku,
      category_id: categoryId,
      price,
      stock_quantity,
      short_description,
      is_active: true,
      featured: false,
    };
  });

  console.log(`\n⚙️  ${formattedProducts.length} items tayyar hain database insertion ke liye.`);

  // 5. Batch Upsert (Chunks of 50)
  const chunkSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < formattedProducts.length; i += chunkSize) {
    const chunk = formattedProducts.slice(i, i + chunkSize);
    const batchNumber = Math.floor(i / chunkSize) + 1;
    const totalBatches = Math.ceil(formattedProducts.length / chunkSize);

    const { error: upsertError } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'slug' });

    if (upsertError) {
      console.error(`❌ Batch ${batchNumber}/${totalBatches} mein error:`, upsertError.message);
    } else {
      totalInserted += chunk.length;
      console.log(`✅ Batch ${batchNumber}/${totalBatches} uploaded (${chunk.length} items). Total synced: ${totalInserted}`);
    }
  }

  if (totalInserted > 0) {
    console.log(`\n🎉 Kaam Mukammal! Sabhi ${totalInserted} Side Keys Supabase database mein add ho chuke hain.`);
  } else {
    console.log(`\n⚠️ Supabase Database mein RLS (Row Level Security) active hone ki wajah se anon key direct write allow nahi kar rahi.`);
    console.log(`💡 Hul (Solution):`);
    console.log(`   Option 1: Apne Supabase Dashboard -> Project Settings -> API se "service_role" secret key copy karein aur .env.local mein SUPABASE_SERVICE_ROLE_KEY=... ke tor par save karein.`);
    console.log(`   Option 2: Supabase Dashboard -> SQL Editor mein ja kar 'supabase/seed_sidekeys.sql' file ka content paste karein aur Run button dabayein.`);
  }
}

runSeed().catch((err) => {
  console.error('Fatal execution error:', err);
});
