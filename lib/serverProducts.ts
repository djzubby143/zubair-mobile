import fs from "fs";
import path from "path";
import { Product } from "./types";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "zubair-data") : path.resolve(process.cwd(), "data");
const CUSTOM_PRODUCTS_FILE = path.join(DATA_DIR, "custom_products.json");
const DELETED_PRODUCTS_FILE = path.join(DATA_DIR, "deleted_products.json");

// In-memory cache fallback to ensure serverless warm functions retain state without crashing
const globalStore = global as unknown as {
  __zubair_custom_products?: Product[];
  __zubair_deleted_keys?: Set<string>;
};

if (!globalStore.__zubair_custom_products) {
  globalStore.__zubair_custom_products = [];
}
if (!globalStore.__zubair_deleted_keys) {
  globalStore.__zubair_deleted_keys = new Set<string>();
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // Read-only filesystem warning, safe fallback to memory
  }
}

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), "data");
const BUNDLED_CUSTOM_PRODUCTS_FILE = path.join(BUNDLED_DATA_DIR, "custom_products.json");
const BUNDLED_DELETED_PRODUCTS_FILE = path.join(BUNDLED_DATA_DIR, "deleted_products.json");

export function getServerCustomProducts(): Product[] {
  try {
    ensureDataDir();
    // 1. Try writable /tmp (or local data dir)
    if (fs.existsSync(CUSTOM_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(CUSTOM_PRODUCTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalStore.__zubair_custom_products = parsed;
        return parsed;
      }
    }
    // 2. Fallback to bundled repository data file if running in Vercel
    if (IS_VERCEL && fs.existsSync(BUNDLED_CUSTOM_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_CUSTOM_PRODUCTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalStore.__zubair_custom_products = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // Silently continue to memory store
  }
  return globalStore.__zubair_custom_products || [];
}

export function getServerDeletedKeys(): Set<string> {
  const set = new Set<string>(globalStore.__zubair_deleted_keys || []);
  try {
    ensureDataDir();
    if (fs.existsSync(DELETED_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const k of arr) {
          if (k) set.add(String(k).toLowerCase());
        }
      }
    } else if (IS_VERCEL && fs.existsSync(BUNDLED_DELETED_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_DELETED_PRODUCTS_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const k of arr) {
          if (k) set.add(String(k).toLowerCase());
        }
      }
    }
  } catch {}
  return set;
}

export function saveServerCustomProducts(products: Product[]) {
  globalStore.__zubair_custom_products = products;
  try {
    ensureDataDir();
    fs.writeFileSync(CUSTOM_PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
  } catch (e) {
    // Handled in-memory on read-only serverless platforms
  }
}

export function saveServerDeletedKey(keyOrKeys: string | string[]) {
  const set = getServerDeletedKeys();
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (const k of keys) {
    if (!k) continue;
    const s = String(k).toLowerCase().trim();
    if (s) {
      set.add(s);
      const clean = s.replace(/[^a-z0-9]/g, "");
      if (clean) set.add(clean);
    }
  }
  globalStore.__zubair_deleted_keys = set;
  try {
    ensureDataDir();
    fs.writeFileSync(DELETED_PRODUCTS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
  } catch (e) {
    // Handled in-memory on read-only serverless platforms
  }
}
