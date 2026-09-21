import { Product } from "./types";

export const DEFAULT_CATALOG_PRODUCTS: Product[] = [
  // Samsung Charging Flexes (Specifically requested by user)
  {
    id: "p-flx-sam-1",
    name: "SAMSUNG A12 CHARGING FLEX WITH IC",
    slug: "samsung-a12-charging-flex-with-ic",
    sku: "ZB-FLX-SA12",
    price: 350,
    stock_quantity: 65,
    short_description: "Original fast charging flex with microphone and headphone jack IC",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },
  {
    id: "p-flx-sam-2",
    name: "SAMSUNG A02S / A03S CHARGING FLEX BOARD",
    slug: "samsung-a02s-a03s-charging-flex-board",
    sku: "ZB-FLX-SA02S",
    price: 380,
    stock_quantity: 45,
    short_description: "Sub-board charging dock port with clear voice mic IC",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },
  {
    id: "p-flx-sam-3",
    name: "SAMSUNG A32 4G CHARGING FLEX BOARD",
    slug: "samsung-a32-4g-charging-flex-board",
    sku: "ZB-FLX-SA32",
    price: 420,
    stock_quantity: 30,
    short_description: "Original fast charge compatible flex sub-board",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },
  {
    id: "p-flx-sam-4",
    name: "SAMSUNG A51 CHARGING FLEX RIBBON & DOCK",
    slug: "samsung-a51-charging-flex-ribbon-dock",
    sku: "ZB-FLX-SA51",
    price: 450,
    stock_quantity: 28,
    short_description: "Genuine high grade replacement charging port strip",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },
  {
    id: "p-flx-sam-5",
    name: "SAMSUNG A10S CHARGING FLEX WITH MIC",
    slug: "samsung-a10s-charging-flex-with-mic",
    sku: "ZB-FLX-SA10S",
    price: 320,
    stock_quantity: 50,
    short_description: "High quality charging PCB connector with IC",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },

  // Vivo Charging Flexes
  {
    id: "p-9",
    name: "VIVO Y20 IC CHARGING FLEX",
    slug: "vivo-y20-ic-charging-flex",
    sku: "ZB-FLX-VY20",
    price: 350,
    stock_quantity: 65,
    short_description: "Fast charging flex with original IC protection",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },
  {
    id: "p-10",
    name: "VIVO Y-21 IC CHARGING FLEX",
    slug: "vivo-y-21-ic-charging-flex",
    sku: "ZB-FLX-VY21",
    price: 370,
    stock_quantity: 50,
    short_description: "Original charging flex with mic for Vivo Y21/Y33s",
    image_url: null,
    category: { id: "cat-flex", name: "CHARGING FLEX", slug: "charging-flex" },
    is_active: true,
  },

  // Units / LCDs
  {
    id: "p-1",
    name: "VIVO Y20 SUNLONG BLACK UNIT",
    slug: "vivo-y20-sunlong-black-unit",
    sku: "ZB-LCD-V20S",
    price: 1850,
    stock_quantity: 45,
    short_description: "High brightness Sunlong LCD display panel",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-2",
    name: "VIVO Y20(ZNF) Y21-Y33S-Y17S-Y22 BLACK UNIT",
    slug: "vivo-y20-znf-y21-y33s-y17s-y22-black-unit",
    sku: "ZB-LCD-V20ZNF",
    price: 1950,
    stock_quantity: 30,
    short_description: "ZNF factory grade combo screen assembly",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-3",
    name: "VIVO Y20 ALL (ZOXOI) BLACK UNIT",
    slug: "vivo-y20-all-zoxoi-black-unit",
    sku: "ZB-LCD-ZOX20",
    price: 1900,
    stock_quantity: 25,
    short_description: "ZOXOI certified black unit with touch",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-4",
    name: "VIVO Y20 (MARKHOR) Y21 BLACK UNIT",
    slug: "vivo-y20-markhor-y21-black-unit",
    sku: "ZB-LCD-MKR20",
    price: 2100,
    stock_quantity: 18,
    short_description: "Markhor top quality glass finish screen",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-5",
    name: "SAMSUNG A12-A13 5G BLACK UNIT",
    slug: "samsung-a12-a13-5g-black-unit",
    sku: "ZB-LCD-SA12",
    price: 2250,
    stock_quantity: 35,
    short_description: "Samsung A12 / A13 full LCD touch screen combo",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-19",
    name: "SAMSUNG A02S SUNLONG BLACK UNIT",
    slug: "samsung-a02s-sunlong-black-unit",
    sku: "ZB-LCD-SA02S",
    price: 1800,
    stock_quantity: 32,
    short_description: "Sunlong premium series display for Samsung A02s",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-20",
    name: "REDMI 12-13 SUNLONG UNIT",
    slug: "redmi-12-13-sunlong-unit",
    sku: "ZB-LCD-RD12",
    price: 2400,
    stock_quantity: 30,
    short_description: "Xiaomi Redmi 12 and 13 touch screen LCD unit",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },

  // OCA Glasses
  {
    id: "p-6",
    name: "VIVO Y20 BLACK OCA GLASS",
    slug: "vivo-y20-black-oca-glass",
    sku: "ZB-OCA-VY20",
    price: 150,
    stock_quantity: 120,
    short_description: "Original Mitsubishi glue OCA front glass",
    image_url: null,
    category: { id: "cat-oca", name: "OCA GLASS", slug: "oca-glass" },
    is_active: true,
  },
  {
    id: "p-8",
    name: "SAMSUNG A02S BLACK OCA GLASS",
    slug: "samsung-a02s-black-oca-glass",
    sku: "ZB-OCA-SA02S",
    price: 150,
    stock_quantity: 80,
    short_description: "Pre-installed OCA film lens for A02s",
    image_url: null,
    category: { id: "cat-oca", name: "OCA GLASS", slug: "oca-glass" },
    is_active: true,
  },
  {
    id: "p-7",
    name: "OPPO A5S-A12 (ZNF) BLACK UNIT",
    slug: "oppo-a5s-a12-znf-black-unit",
    sku: "ZB-LCD-OPA5S",
    price: 1750,
    stock_quantity: 40,
    short_description: "Oppo A5s / A12 complete display unit",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
  {
    id: "p-11",
    name: "VIVO Y91 (ZNF) Y93-Y95-Y90 BLACK UNIT",
    slug: "vivo-y91-znf-y93-y95-y90-black-unit",
    sku: "ZB-LCD-VY91",
    price: 1800,
    stock_quantity: 30,
    short_description: "Multi-model compatible Vivo LCD unit",
    image_url: null,
    category: { id: "cat-lcd", name: "LCD UNIT", slug: "lcd-unit" },
    is_active: true,
  },
];

// Stopwords in Urdu, Roman Urdu & English to filter out
const STOP_WORDS = new Set([
  "ki",
  "ka",
  "ke",
  "ko",
  "k",
  "keliye",
  "keliay",
  "wala",
  "wali",
  "waly",
  "wale",
  "aur",
  "or",
  "the",
  "a",
  "an",
  "in",
  "of",
  "for",
  "with",
  "mobile",
]);

/**
 * Advanced Multi-token Smart Search
 * Matches queries like "samsung ki charging flex", "vivo y20 unit", "touch glass a12"
 */
export function advancedSearchProducts(query: string, products: Product[]): Product[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  // Split query into tokens and remove stop words
  const rawTokens = clean.split(/[\s,+/_-]+/);
  const tokens = rawTokens.filter((t) => t.length > 0 && !STOP_WORDS.has(t));

  // If all tokens were stopwords, fallback to raw tokens
  const activeTokens = tokens.length > 0 ? tokens : rawTokens;

  const scored: { product: Product; score: number }[] = [];

  for (const product of products) {
    const name = product.name.toLowerCase();
    const sku = (product.sku || "").toLowerCase();
    const cat = (product.category?.name || "").toLowerCase();
    const desc = (product.short_description || "").toLowerCase();
    const searchable = `${name} ${sku} ${cat} ${desc}`;

    let matchedTokens = 0;
    let score = 0;

    // Check exact full phrase match
    if (searchable.includes(clean)) {
      score += 100;
    }

    // Check each token
    for (const token of activeTokens) {
      if (searchable.includes(token)) {
        matchedTokens++;
        // Extra boost if token appears in product title
        if (name.includes(token)) score += 30;
        // Boost if token appears in category
        if (cat.includes(token)) score += 20;
        // Boost if matches SKU
        if (sku.includes(token)) score += 25;
      }
    }

    // If all or most tokens matched, include in results
    if (matchedTokens === activeTokens.length) {
      score += 50; // Full match bonus
      scored.push({ product, score });
    } else if (activeTokens.length > 1 && matchedTokens >= Math.ceil(activeTokens.length * 0.6)) {
      // Partial match for longer queries
      scored.push({ product, score });
    } else if (activeTokens.length === 1 && matchedTokens === 1) {
      scored.push({ product, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.product);
}
