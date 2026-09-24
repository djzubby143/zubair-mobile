import { Product, ParsedSearchIntent, SearchSuggestion } from "@/lib/types";

export const STORAGE_KEY_RECENT_SEARCHES = "zubair_recent_searches";

// Known Brand dictionary
const BRAND_SYNONYMS: { [brand: string]: string[] } = {
  Apple: ["iphone", "apple", "ios", "ip"],
  Samsung: ["samsung", "galaxy", "sam", "sm-"],
  Vivo: ["vivo"],
  Oppo: ["oppo", "realme"],
  Infinix: ["infinix", "inf"],
  Tecno: ["tecno"],
  Xiaomi: ["xiaomi", "redmi", "mi", "poco"],
  Realme: ["realme"],
  Huawei: ["huawei", "honor"],
};

// Known Part Type dictionary with Roman Urdu and colloquial synonyms
const PART_SYNONYMS: { [part: string]: string[] } = {
  "LCD Unit": [
    "lcd",
    "display",
    "screen",
    "unit",
    "panel",
    "combo",
    "folder",
    "touch",
    "front",
    "screen panel",
  ],
  "Charging Flex": [
    "charging",
    "charge",
    "charging flex",
    "pin",
    "strip",
    "charging strip",
    "charging pcb",
    "port",
    "charger",
    "charging patta",
    "patta",
  ],
  "Battery": ["battery", "cell", "battery pack", "mah", "original battery", "timer"],
  "Camera": ["camera", "cam", "lens", "back camera", "front camera", "glass lens", "shutter"],
  "Side Key": ["side key", "button", "power button", "volume button", "side button", "switch", "key flex", "on off"],
  "OCA Glass": ["oca", "glass", "touch glass", "outer glass", "front glass", "sheesha"],
  "IC Parts": ["ic", "power ic", "charging ic", "light ic", "audio ic", "chip", "cpu", "bga"],
  "Housing / Body": ["housing", "body", "casing", "back cover", "middle frame", "dabba"],
  "Speaker / Ringer": ["speaker", "ringer", "buzzer", "earpiece", "mic", "microphone"],
};

// Roman Urdu stopwords to strip out
const ROMAN_URDU_STOPWORDS = new Set([
  "ka",
  "ki",
  "ke",
  "ko",
  "k",
  "wala",
  "wali",
  "wale",
  "waly",
  "chahiye",
  "mil",
  "jaye",
  "ga",
  "gi",
  "hai",
  "hain",
  "bhai",
  "dost",
  "rate",
  "price",
  "kya",
  "best",
  "for",
  "in",
  "with",
  "phone",
  "mobile",
]);

/**
 * Intelligent Natural Language Parser for Mobile Spare Part Search
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const normalized = rawQuery.toLowerCase().trim();
  const rawTokens = normalized.split(/[\s,+/_-]+/).filter(Boolean);

  let detectedBrand: string | undefined;
  let detectedPartType: string | undefined;
  let detectedQuality: string | undefined;

  // Filter out stop words but keep significant tokens
  const cleanTokens: string[] = [];

  for (const token of rawTokens) {
    // Check Quality FIRST before stopwords
    if (token === "original" || token === "orignal" || token === "orig" || token === "og") {
      detectedQuality = "Original";
      continue;
    }
    if (token === "oem") {
      detectedQuality = "OEM";
      continue;
    }
    if (token === "copy" || token === "china" || token === "local") {
      detectedQuality = "Copy";
      continue;
    }

    if (ROMAN_URDU_STOPWORDS.has(token)) {
      continue;
    }

    // Check Brand
    if (!detectedBrand) {
      for (const [brandName, syns] of Object.entries(BRAND_SYNONYMS)) {
        if (syns.some((s) => token.startsWith(s) || token === s)) {
          detectedBrand = brandName;
          break;
        }
      }
    }

    // Check Part Type
    if (!detectedPartType) {
      for (const [partName, syns] of Object.entries(PART_SYNONYMS)) {
        if (syns.some((s) => token.includes(s) || s.includes(token))) {
          detectedPartType = partName;
          break;
        }
      }
    }

    cleanTokens.push(token);
  }

  // Model detection: remaining tokens that contain alphanumeric strings or numbers (e.g. "13", "a52", "y20", "f11", "hot10")
  let detectedModel: string | undefined;
  for (const token of cleanTokens) {
    const isBrandToken = detectedBrand && BRAND_SYNONYMS[detectedBrand]?.some((s) => token.includes(s));
    const isPartToken = detectedPartType && PART_SYNONYMS[detectedPartType]?.some((s) => token.includes(s));

    if (!isBrandToken && !isPartToken) {
      // Looks like a model number (has digit, or starts with a, y, f, note, hot, spark)
      if (
        /\d/.test(token) ||
        ["y20", "y21", "y33s", "a12", "a52", "f11", "f17", "spark", "hot", "note", "pro", "plus", "max"].includes(token)
      ) {
        detectedModel = token.toUpperCase();
        break;
      }
    }
  }

  return {
    rawQuery,
    brand: detectedBrand,
    model: detectedModel,
    category: detectedPartType,
    partType: detectedPartType,
    qualityGrade: detectedQuality,
    tokens: cleanTokens,
  };
}

/**
 * AI Powered Search & Ranking
 */
export function aiSearchProducts(query: string, allProducts: Product[]): {
  intent: ParsedSearchIntent;
  results: Product[];
  products: Product[];
  totalMatches: number;
  total_matches: number;
  suggestions: SearchSuggestion[];
} {
  const intent = parseSearchIntent(query);
  const cleanQ = query.toLowerCase().trim();

  if (!cleanQ) {
    const active = allProducts.filter((p) => p.is_active !== false);
    return {
      intent,
      results: active,
      products: active,
      totalMatches: active.length,
      total_matches: active.length,
      suggestions: getSearchSuggestions("", allProducts),
    };
  }

  const scored: { product: Product; score: number }[] = [];

  for (const product of allProducts) {
    if (product.is_active === false) continue;

    const name = (product.name || "").toLowerCase();
    const sku = (product.sku || "").toLowerCase();
    const brand = (product.brand || "").toLowerCase();
    const model = (product.model || "").toLowerCase();
    const partType = (product.part_type || "").toLowerCase();
    const comp = Array.isArray(product.compatible_models)
      ? product.compatible_models.join(" ").toLowerCase()
      : (product.compatible_models || "").toLowerCase();
    const grade = (product.quality_grade || "").toLowerCase();

    let score = 0;

    // 1. Direct exact match
    if (name.includes(cleanQ)) score += 100;
    if (sku.includes(cleanQ)) score += 120;

    // 2. Intent matching
    let brandMatches = false;
    let modelMatches = false;
    let partMatches = false;
    let qualityMatches = false;

    if (intent.brand) {
      const bLower = intent.brand.toLowerCase();
      if (brand.includes(bLower) || name.includes(bLower)) {
        score += 40;
        brandMatches = true;
      } else if (brand && brand !== bLower) {
        // Query explicitly wanted this brand, but product is a different brand
        score -= 50;
      }
    }

    if (intent.model) {
      const mLower = intent.model.toLowerCase();
      if (model.includes(mLower) || name.includes(mLower) || comp.includes(mLower) || sku.includes(mLower)) {
        score += 50;
        modelMatches = true;
      }
    }

    if (intent.partType) {
      const syns = PART_SYNONYMS[intent.partType] || [];
      const matchesPart = syns.some((s) => name.includes(s) || partType.includes(s));
      if (matchesPart) {
        score += 50;
        partMatches = true;
      }
    }

    if (intent.qualityGrade && grade.includes(intent.qualityGrade.toLowerCase())) {
      score += 40;
      qualityMatches = true;
    }

    // Compounding multi-attribute bonus (e.g. brand + model + part)
    if (brandMatches && partMatches) score += 60;
    if (brandMatches && modelMatches && partMatches) score += 100;
    if (qualityMatches && (brandMatches || partMatches)) score += 40;

    // 3. Token matches
    for (const t of intent.tokens) {
      if (name.includes(t)) score += 20;
      if (comp.includes(t)) score += 15;
      if (sku.includes(t)) score += 20;
    }

    // Must have sufficient relevance
    if (score >= 35) {
      scored.push({ product, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const results = scored.map((s) => s.product);
  return {
    intent,
    results,
    products: results,
    totalMatches: scored.length,
    total_matches: scored.length,
    suggestions: getSearchSuggestions(query, allProducts),
  };
}

/**
 * Suggestions, Recent and Popular Searches
 */
export const POPULAR_SEARCHES = [
  "iPhone 11 LCD display",
  "Vivo Y20 charging flex",
  "Samsung A12 unit original",
  "Infinix Hot 10 battery",
  "Oppo F11 glass panel",
  "Redmi Note 10 camera",
  "Samsung A52 charging strip",
  "Vivo Y20 side key button",
];

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.slice(0, 8);
    }
  } catch {}
  return [];
}

export function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const list = getRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase().trim());
    const updated = [query.trim(), ...list].slice(0, 10);
    localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(updated));
  } catch {}
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
  } catch {}
}

export function getSearchSuggestions(query: string, allProducts: Product[] = []): SearchSuggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const suggestions: SearchSuggestion[] = [];
  const intent = parseSearchIntent(q);

  // If detected intent has brand & model, offer smart composite suggestion
  if (intent.brand && intent.model) {
    suggestions.push({
      text: `${intent.brand} ${intent.model} All Parts & LCD`,
      type: "model",
      badge: "Smart Match",
    });
  }

  // Brand matches
  for (const b of Object.keys(BRAND_SYNONYMS)) {
    if (b.toLowerCase().startsWith(q)) {
      suggestions.push({
        text: `${b} Mobile Spare Parts`,
        type: "brand",
        badge: "Brand",
      });
    }
  }

  // Product title prefix/contains matches
  for (const p of allProducts) {
    if (suggestions.length >= 8) break;
    if (p.is_active === false) continue;
    if (p.name.toLowerCase().includes(q)) {
      suggestions.push({
        text: p.name,
        type: "product",
        badge: p.quality_grade || "Part",
      });
    }
  }

  return suggestions.slice(0, 8);
}

export const getSmartSearchSuggestions = getSearchSuggestions;
