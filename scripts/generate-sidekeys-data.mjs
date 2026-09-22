import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const projectRoot = process.cwd();
const wb = xlsx.readFile(path.join(projectRoot, "Zubair_Mobile_Side_Keys.xlsx"));
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Side Keys Clean"]);

function extractModelName(rawName) {
  let cleaned = rawName.trim().replace(/^side\s*key\s*[-–—]?\s*/i, "").replace(/\s*side\s*key\s*$/i, "");
  return cleaned.trim() || rawName.trim();
}

const slugSet = new Set();
const skuSet = new Set();

const products = rows.map((row, idx) => {
  const rawName = String(row["Item Name"] || "").trim();
  const model = extractModelName(rawName);
  const price = Math.max(0, Math.round(Number(row["Sale Price (PKR)"]) || 75));
  const purchasePrice = Math.max(0, Math.round(Number(row["Purchase Price (PKR)"]) || 0));
  const rawStock = row["Current Stock"] ?? 0;
  const stockQuantity = Math.max(0, parseInt(String(rawStock), 10) || 0);

  let slug = "sidekey-" + model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slugSet.has(slug)) {
    let c = 1;
    while (slugSet.has(`${slug}-${c}`)) c++;
    slug = `${slug}-${c}`;
  }
  slugSet.add(slug);

  const skuPart = model.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let sku = "ZB-SDK-" + (skuPart || String(idx + 1).padStart(3, "0"));
  if (skuSet.has(sku)) {
    let c = 1;
    while (skuSet.has(`${sku}-${c}`)) c++;
    sku = `${sku}-${c}`;
  }
  skuSet.add(sku);

  return {
    id: "p-sdk-" + slug,
    name: rawName,
    slug: slug,
    sku: sku,
    price: price,
    purchase_price: purchasePrice > 0 ? purchasePrice : undefined,
    stock_quantity: stockQuantity,
    short_description: "Genuine mobile replacement side key / button for " + model + ".",
    category: {
      id: "f1f0fb31-2b9b-4666-9149-ea669e417a8e",
      name: "Side Keys",
      slug: "side-keys",
    },
    is_active: true,
    featured: false,
  };
});

const fileContent = `// Auto-generated Side Keys data (239 items)
import { Product } from "./types";

export const SIDE_KEY_PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(path.join(projectRoot, "lib", "sidekeysData.ts"), fileContent, "utf8");
console.log("Successfully generated lib/sidekeysData.ts with", products.length, "items");
