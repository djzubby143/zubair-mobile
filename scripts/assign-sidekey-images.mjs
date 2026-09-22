import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const filePath = path.join(projectRoot, 'lib', 'sidekeysData.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Parse the JSON array inside SIDE_KEY_PRODUCTS = [...]
const match = content.match(/export const SIDE_KEY_PRODUCTS: Product\[\] = (\[[\s\S]*\]);/);
if (!match) {
  console.error("Could not find SIDE_KEY_PRODUCTS array");
  process.exit(1);
}

const products = JSON.parse(match[1]);
console.log(`Loaded ${products.length} products from sidekeysData.ts`);

let updatedCount = 0;
const updatedProducts = products.map((p) => {
  updatedCount++;
  return {
    ...p,
    image_url: "/images/sidekey-placeholder.svg",
  };
});

const newContent = `// Auto-generated Side Keys data (${updatedProducts.length} items)
import { Product } from "./types";

export const SIDE_KEY_PRODUCTS: Product[] = ${JSON.stringify(updatedProducts, null, 2)};
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Successfully updated ${updatedCount} products with image_url in lib/sidekeysData.ts`);
