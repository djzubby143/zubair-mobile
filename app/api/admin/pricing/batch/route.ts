import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getServerCustomProducts, saveServerCustomProducts } from "@/lib/serverProducts";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";

export const dynamic = "force-dynamic";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PRICE_HISTORY_FILE = path.join(DATA_DIR, "price_history.json");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates, reason, changed_by } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: "No updates provided" }, { status: 400 });
    }

    const customProducts = getServerCustomProducts();
    const nowIso = new Date().toISOString();
    const updatedProducts: Product[] = [];
    const historyEntries: any[] = [];

    for (const update of updates) {
      const { id, sku, retail_price, wholesale_price, technician_price } = update;
      const idx = customProducts.findIndex(
        (p) => (id && p.id === id) || (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase())
      );

      let targetProd: Product;
      if (idx !== -1) {
        targetProd = {
          ...customProducts[idx],
          ...(retail_price !== undefined ? { retail_price: Number(retail_price), price: Number(retail_price) } : {}),
          ...(wholesale_price !== undefined ? { wholesale_price: Number(wholesale_price) } : {}),
          ...(technician_price !== undefined ? { technician_price: Number(technician_price) } : {}),
          updated_at: nowIso,
        };
        customProducts[idx] = targetProd;
      } else {
        const def = DEFAULT_CATALOG_PRODUCTS.find(
          (p) => (id && p.id === id) || (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase())
        );
        if (def) {
          targetProd = {
            ...def,
            ...(retail_price !== undefined ? { retail_price: Number(retail_price), price: Number(retail_price) } : {}),
            ...(wholesale_price !== undefined ? { wholesale_price: Number(wholesale_price) } : {}),
            ...(technician_price !== undefined ? { technician_price: Number(technician_price) } : {}),
            updated_at: nowIso,
          };
          customProducts.unshift(targetProd);
        } else {
          continue;
        }
      }

      updatedProducts.push(targetProd);

      historyEntries.push({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: targetProd.id,
        product_name: targetProd.name,
        sku: targetProd.sku,
        retail_price: targetProd.retail_price,
        wholesale_price: targetProd.wholesale_price,
        technician_price: targetProd.technician_price,
        changed_by: changed_by || "Admin",
        reason: reason || "Bulk price adjustment",
        created_at: nowIso,
      });

      // Try Supabase update
      try {
        await supabase
          .from("products")
          .update({
            price: targetProd.price,
            retail_price: targetProd.retail_price,
            wholesale_price: targetProd.wholesale_price,
            technician_price: targetProd.technician_price,
            updated_at: nowIso,
          })
          .or(`id.eq.${targetProd.id},sku.eq.${targetProd.sku || "none"}`);
      } catch {}
    }

    saveServerCustomProducts(customProducts);

    // Save history entries to local history file
    try {
      let existingHistory: any[] = [];
      if (fs.existsSync(PRICE_HISTORY_FILE)) {
        existingHistory = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, "utf-8"));
      }
      const combinedHistory = [...historyEntries, ...existingHistory].slice(0, 500);
      fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(combinedHistory, null, 2), "utf-8");
    } catch (e) {
      console.warn("Notice saving price history file:", e);
    }

    return NextResponse.json({
      success: true,
      count: updatedProducts.length,
      updatedProducts,
      logs: historyEntries,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
