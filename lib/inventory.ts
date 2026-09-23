import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { getCustomProducts, saveCustomProducts } from "@/lib/customProducts";
import { Order } from "@/lib/orders";

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  purchase_price: number;
  wholesale_price?: number;
  subtotal: number;
}

export interface PurchaseEntry {
  id: string;
  purchase_number: string;
  supplier_id?: string;
  supplier_name: string;
  purchase_date: string;
  reference_invoice_no?: string;
  items: PurchaseItem[];
  total_items: number;
  total_amount: number;
  paid_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
  payment_method: string;
  status: "received" | "ordered" | "cancelled";
  notes?: string;
  created_at: string;
}

export const STORAGE_KEY_SUPPLIERS = "zubair_mobile_suppliers";
export const STORAGE_KEY_PURCHASES = "zubair_mobile_purchases";

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "Hall Road Mobile Parts Importers",
    contact_person: "Haji Abdul Rehman",
    phone: "0300-8456123",
    email: "hallroad.parts@example.com",
    city: "Lahore",
    address: "Shop # 18, Bilal Centre, Hall Road, Lahore",
    payment_terms: "15 Days Credit",
    notes: "Direct container importer of LCD units and OCA glasses.",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "sup-2",
    name: "China Direct Tech Shenzhen",
    contact_person: "Mr. Lin / Ali Raza",
    phone: "0321-4567890",
    email: "shenzhen.direct@example.com",
    city: "Karachi",
    address: "Saddar Electronic Market, Karachi",
    payment_terms: "Cash on Bilty / Cargo",
    notes: "Original IC charging flexes and side keys supplier.",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "sup-3",
    name: "Hafeez Center Wholesale Hub",
    contact_person: "Mian Tariq",
    phone: "0333-7890123",
    email: "tariq.parts@example.com",
    city: "Lahore",
    address: "Basement Shop 4, Hafeez Center, Gulberg, Lahore",
    payment_terms: "Cash",
    notes: "Local urgent supplies for batteries and tools.",
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

export const DEFAULT_PURCHASES: PurchaseEntry[] = [
  {
    id: "po-1001",
    purchase_number: "PO-2401",
    supplier_id: "sup-1",
    supplier_name: "Hall Road Mobile Parts Importers",
    purchase_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    reference_invoice_no: "INV-98214-LHR",
    total_items: 65,
    total_amount: 142500,
    paid_amount: 100000,
    payment_status: "partial",
    payment_method: "Bank Transfer",
    status: "received",
    notes: "Consignment received via Daewoo cargo in good condition.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        product_id: "prod-1",
        product_name: "VIVO Y20 SUNLONG BLACK UNIT",
        sku: "ZB-LCD-V20S",
        quantity: 25,
        purchase_price: 2050,
        wholesale_price: 2650,
        subtotal: 51250,
      },
      {
        product_id: "prod-9",
        product_name: "VIVO Y20 IC CHARGING FLEX",
        sku: "ZB-FLX-VY20",
        quantity: 40,
        purchase_price: 220,
        wholesale_price: 320,
        subtotal: 8800,
      },
    ],
  },
];

/**
 * Fetch all suppliers (Supabase with localStorage & default fallback)
 */
export async function getSuppliers(): Promise<Supplier[]> {
  let list: Supplier[] = [];

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      list = data as Supplier[];
    }
  } catch (err) {
    console.warn("Notice reading suppliers from Supabase:", err);
  }

  // Fallback / merge with localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge avoiding duplicate IDs
          const idSet = new Set(list.map((s) => s.id));
          for (const s of parsed) {
            if (!idSet.has(s.id)) {
              list.push(s);
              idSet.add(s.id);
            }
          }
        }
      } else if (list.length === 0) {
        list = [...DEFAULT_SUPPLIERS];
        localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(list));
      }
    } catch (err) {
      console.warn("Notice reading suppliers localStorage:", err);
    }
  }

  if (list.length === 0) {
    list = [...DEFAULT_SUPPLIERS];
  }

  return list;
}

/**
 * Save or update a supplier
 */
export async function saveSupplier(supplier: Supplier): Promise<Supplier> {
  const now = new Date().toISOString();
  const record: Supplier = {
    ...supplier,
    updated_at: now,
  };

  // 1. Update localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
      const list: Supplier[] = stored ? JSON.parse(stored) : [...DEFAULT_SUPPLIERS];
      const idx = list.findIndex((s) => s.id === record.id);
      if (idx !== -1) {
        list[idx] = record;
      } else {
        list.unshift(record);
      }
      localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_suppliers_updated", { detail: list }));
    } catch (err) {
      console.warn("Notice saving supplier to localStorage:", err);
    }
  }

  // 2. Update Supabase
  try {
    await supabase.from("suppliers").upsert([
      {
        id: record.id,
        name: record.name,
        contact_person: record.contact_person || null,
        phone: record.phone,
        email: record.email || null,
        city: record.city || "Lahore",
        address: record.address || null,
        payment_terms: record.payment_terms || "Cash",
        notes: record.notes || null,
        updated_at: now,
      },
    ]);
  } catch (err) {
    console.warn("Notice saving supplier to Supabase:", err);
  }

  return record;
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
      const list: Supplier[] = stored ? JSON.parse(stored) : [...DEFAULT_SUPPLIERS];
      const filtered = list.filter((s) => s.id !== supplierId);
      localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(filtered));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_suppliers_updated", { detail: filtered }));
    } catch (err) {
      console.warn("Notice deleting supplier localStorage:", err);
    }
  }

  try {
    await supabase.from("suppliers").delete().eq("id", supplierId);
  } catch (err) {
    console.warn("Notice deleting supplier Supabase:", err);
  }
}

/**
 * Fetch all purchase entries
 */
export async function getPurchases(): Promise<PurchaseEntry[]> {
  let list: PurchaseEntry[] = [];

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      list = data as PurchaseEntry[];
    }
  } catch (err) {
    console.warn("Notice reading purchases from Supabase:", err);
  }

  // 2. Merge with localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PURCHASES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idSet = new Set(list.map((p) => p.id));
          for (const p of parsed) {
            if (!idSet.has(p.id)) {
              list.push(p);
              idSet.add(p.id);
            }
          }
        }
      } else if (list.length === 0) {
        list = [...DEFAULT_PURCHASES];
        localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(list));
      }
    } catch (err) {
      console.warn("Notice reading purchases localStorage:", err);
    }
  }

  if (list.length === 0) {
    list = [...DEFAULT_PURCHASES];
  }

  return list;
}

/**
 * Save a new purchase entry AND automatically increase product stock!
 */
export async function savePurchaseEntry(entry: PurchaseEntry): Promise<PurchaseEntry> {
  // 1. Save Purchase Entry to localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PURCHASES);
      const list: PurchaseEntry[] = stored ? JSON.parse(stored) : [...DEFAULT_PURCHASES];
      const idx = list.findIndex((p) => p.id === entry.id);
      if (idx !== -1) {
        list[idx] = entry;
      } else {
        list.unshift(entry);
      }
      localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_purchases_updated", { detail: list }));
    } catch (err) {
      console.warn("Notice saving purchase entry to localStorage:", err);
    }
  }

  // 2. Save to Supabase purchases table
  try {
    await supabase.from("purchases").insert([
      {
        id: entry.id,
        purchase_number: entry.purchase_number,
        supplier_id: entry.supplier_id || null,
        supplier_name: entry.supplier_name,
        purchase_date: entry.purchase_date,
        reference_invoice_no: entry.reference_invoice_no || null,
        items: entry.items,
        total_items: entry.total_items,
        total_amount: entry.total_amount,
        paid_amount: entry.paid_amount,
        payment_status: entry.payment_status,
        payment_method: entry.payment_method,
        status: entry.status,
        notes: entry.notes || null,
        created_at: entry.created_at || new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn("Notice saving purchase entry to Supabase:", err);
  }

  // 3. AUTOMATIC STOCK INCREASE: Update each purchased product's stock_quantity
  await increaseStockForPurchase(entry.items);

  return entry;
}

/**
 * Automatically increases stock quantity for each purchased item
 */
export async function increaseStockForPurchase(items: PurchaseItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  // A. Update in localStorage custom products
  if (typeof window !== "undefined") {
    try {
      const customProducts = getCustomProducts();
      let hasChanges = false;

      for (const item of items) {
        const pIdx = customProducts.findIndex(
          (p) =>
            p.id === item.product_id ||
            (p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
            p.name.toLowerCase() === item.product_name.toLowerCase()
        );

        if (pIdx !== -1) {
          const prev = customProducts[pIdx];
          const newStock = (Number(prev.stock_quantity) || 0) + Number(item.quantity);
          customProducts[pIdx] = {
            ...prev,
            stock_quantity: newStock,
            purchase_price: item.purchase_price > 0 ? item.purchase_price : prev.purchase_price,
            wholesale_price:
              item.wholesale_price && item.wholesale_price > 0
                ? item.wholesale_price
                : prev.wholesale_price,
            price:
              item.wholesale_price && item.wholesale_price > 0
                ? item.wholesale_price
                : prev.price,
            updated_at: new Date().toISOString(),
          };
          hasChanges = true;
        } else {
          // Add as custom product if not in custom list
          customProducts.unshift({
            id: item.product_id,
            name: item.product_name,
            slug: item.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            sku: item.sku,
            price: item.wholesale_price || Math.round(item.purchase_price * 1.25),
            wholesale_price: item.wholesale_price || Math.round(item.purchase_price * 1.25),
            technician_price: Math.round(item.purchase_price * 1.35),
            retail_price: Math.round(item.purchase_price * 1.55),
            purchase_price: item.purchase_price,
            stock_quantity: item.quantity,
            min_order_quantity: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          hasChanges = true;
        }
      }

      if (hasChanges) {
        saveCustomProducts(customProducts);
      }
    } catch (err) {
      console.warn("Notice updating custom products stock:", err);
    }
  }

  // B. Update stock in Supabase database
  for (const item of items) {
    try {
      // Fetch current stock first
      const { data: prodData } = await supabase
        .from("products")
        .select("id, stock_quantity, purchase_price, price, wholesale_price")
        .or(`id.eq.${item.product_id},sku.ilike.${item.sku}`)
        .maybeSingle();

      if (prodData) {
        const updatedStock = (Number(prodData.stock_quantity) || 0) + Number(item.quantity);
        const updates: Record<string, unknown> = {
          stock_quantity: updatedStock,
          purchase_price: item.purchase_price > 0 ? item.purchase_price : prodData.purchase_price,
          updated_at: new Date().toISOString(),
        };

        if (item.wholesale_price && item.wholesale_price > 0) {
          updates.wholesale_price = item.wholesale_price;
          updates.price = item.wholesale_price;
        }

        await supabase.from("products").update(updates).eq("id", prodData.id);
      }
    } catch (sbErr) {
      console.warn("Notice updating Supabase stock for purchase:", sbErr);
    }
  }

  // C. Notify UI across the app
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_inventory_updated"));
    window.dispatchEvent(new CustomEvent("zubair_products_updated"));
  }
}

/**
 * AUTOMATIC STOCK DECREASE: Automatically decreases product stock when an order is placed!
 */
export async function decreaseStockForOrder(order: Order): Promise<void> {
  if (!order || !order.items || order.items.length === 0) return;

  // A. Update localStorage custom products stock
  if (typeof window !== "undefined") {
    try {
      const customProducts = getCustomProducts();
      let hasChanges = false;

      for (const item of order.items) {
        const pIdx = customProducts.findIndex(
          (p) =>
            p.id === item.id ||
            (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
            p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (pIdx !== -1) {
          const current = customProducts[pIdx];
          const newStock = Math.max(0, (Number(current.stock_quantity) || 0) - Number(item.quantity));
          customProducts[pIdx] = {
            ...current,
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          };
          hasChanges = true;
        }
      }

      if (hasChanges) {
        saveCustomProducts(customProducts);
      }
    } catch (err) {
      console.warn("Notice decreasing local stock for order:", err);
    }
  }

  // B. Update stock in Supabase database
  for (const item of order.items) {
    try {
      const { data: prodData } = await supabase
        .from("products")
        .select("id, stock_quantity")
        .or(`id.eq.${item.id},sku.ilike.${item.sku || "none"}`)
        .maybeSingle();

      if (prodData) {
        const newStock = Math.max(0, (Number(prodData.stock_quantity) || 0) - Number(item.quantity));
        await supabase
          .from("products")
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prodData.id);
      }
    } catch (err) {
      console.warn("Notice decreasing Supabase stock for order:", err);
    }
  }

  // C. Notify UI across the app
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_inventory_updated"));
    window.dispatchEvent(new CustomEvent("zubair_products_updated"));
  }
}

/**
 * Quick inline stock adjustment by admin
 */
export async function adjustProductStock(
  productId: string,
  newStock: number,
  sku?: string
): Promise<void> {
  const stock = Math.max(0, Number(newStock) || 0);

  // 1. Update localStorage
  if (typeof window !== "undefined") {
    try {
      const customProducts = getCustomProducts();
      const pIdx = customProducts.findIndex(
        (p) => p.id === productId || (sku && p.sku?.toLowerCase() === sku.toLowerCase())
      );
      if (pIdx !== -1) {
        customProducts[pIdx] = {
          ...customProducts[pIdx],
          stock_quantity: stock,
          updated_at: new Date().toISOString(),
        };
        saveCustomProducts(customProducts);
      }
    } catch (err) {
      console.warn("Notice adjusting stock localStorage:", err);
    }
  }

  // 2. Update Supabase
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    if (isUuid) {
      await supabase.from("products").update({ stock_quantity: stock }).eq("id", productId);
    } else if (sku) {
      await supabase.from("products").update({ stock_quantity: stock }).eq("sku", sku);
    }
  } catch (err) {
    console.warn("Notice adjusting stock Supabase:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_inventory_updated"));
    window.dispatchEvent(new CustomEvent("zubair_products_updated"));
  }
}

/**
 * Filter low stock products (<= threshold, default 5)
 */
export function getLowStockProducts(products: Product[], threshold = 5): Product[] {
  return products.filter(
    (p) => p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity <= threshold
  );
}
