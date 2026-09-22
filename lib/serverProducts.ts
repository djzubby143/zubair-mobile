import fs from "fs";
import path from "path";
import { Product } from "./types";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CUSTOM_PRODUCTS_FILE = path.join(DATA_DIR, "custom_products.json");
const DELETED_PRODUCTS_FILE = path.join(DATA_DIR, "deleted_products.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getServerCustomProducts(): Product[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(CUSTOM_PRODUCTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CUSTOM_PRODUCTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading custom_products.json:", err);
    return [];
  }
}

export function getServerDeletedKeys(): Set<string> {
  const set = new Set<string>();
  try {
    ensureDataDir();
    if (!fs.existsSync(DELETED_PRODUCTS_FILE)) {
      return set;
    }
    const raw = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const k of arr) {
        if (k) set.add(String(k).toLowerCase());
      }
    }
  } catch {}
  return set;
}

export function saveServerCustomProducts(products: Product[]) {
  ensureDataDir();
  fs.writeFileSync(CUSTOM_PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export function saveServerDeletedKey(key: string) {
  ensureDataDir();
  const set = getServerDeletedKeys();
  set.add(key.toLowerCase());
  fs.writeFileSync(DELETED_PRODUCTS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
}
