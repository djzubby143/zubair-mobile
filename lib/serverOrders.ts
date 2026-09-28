import fs from "fs";
import path from "path";
import { Order, INITIAL_ORDERS } from "./orders";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "zubair-data") : path.resolve(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// In-memory cache fallback to ensure serverless warm functions retain state
const globalStore = global as unknown as {
  __zubair_orders?: Order[];
};

if (!globalStore.__zubair_orders) {
  globalStore.__zubair_orders = [];
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
const BUNDLED_ORDERS_FILE = path.join(BUNDLED_DATA_DIR, "orders.json");

export function getServerOrders(): Order[] {
  try {
    ensureDataDir();
    // 1. Try writable /tmp (or local data dir)
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalStore.__zubair_orders = parsed;
        return parsed;
      }
    }
    // 2. Fallback to bundled repository data file if running in Vercel
    if (IS_VERCEL && fs.existsSync(BUNDLED_ORDERS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalStore.__zubair_orders = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // Continue to memory store
  }

  if (globalStore.__zubair_orders && globalStore.__zubair_orders.length > 0) {
    return globalStore.__zubair_orders;
  }

  // Initial seed with demo orders
  globalStore.__zubair_orders = [...INITIAL_ORDERS];
  return globalStore.__zubair_orders;
}

export function saveServerOrder(order: Order): void {
  const current = getServerOrders();
  const existingIndex = current.findIndex(
    (o) => o.id === order.id || o.order_number?.toLowerCase() === order.order_number?.toLowerCase()
  );

  let updatedList: Order[];
  if (existingIndex !== -1) {
    updatedList = [...current];
    updatedList[existingIndex] = { ...updatedList[existingIndex], ...order };
  } else {
    updatedList = [order, ...current];
  }

  saveServerOrders(updatedList);
}

export function saveServerOrders(orders: Order[]): void {
  globalStore.__zubair_orders = orders;
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    // Fallback to memory store if disk is read-only
  }
}
