import { NextRequest, NextResponse } from "next/server";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import {
  getServerCustomProducts,
  getServerDeletedKeys,
  saveServerCustomProducts,
  saveServerDeletedKey,
} from "@/lib/serverProducts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const custom = getServerCustomProducts();
    const deleted = getServerDeletedKeys();

    return NextResponse.json({
      success: true,
      customProducts: custom,
      deletedKeys: Array.from(deleted),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Product;
    if (!body || !body.name || !body.sku) {
      return NextResponse.json({ success: false, error: "Name and SKU are required." }, { status: 400 });
    }

    const customProducts = getServerCustomProducts();
    const idx = customProducts.findIndex(
      (p) =>
        (p.id && p.id === body.id) ||
        (p.sku && p.sku.toLowerCase() === body.sku.toLowerCase()) ||
        (p.slug && p.slug.toLowerCase() === body.slug.toLowerCase())
    );

    let updatedList: Product[];
    if (idx !== -1) {
      updatedList = [...customProducts];
      updatedList[idx] = { ...updatedList[idx], ...body, updated_at: new Date().toISOString() };
    } else {
      updatedList = [body, ...customProducts];
    }

    saveServerCustomProducts(updatedList);

    // Also try Supabase upsert
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id);
      const sbRecord: Record<string, unknown> = {
        name: body.name,
        slug: body.slug,
        sku: body.sku,
        category_id: body.category_id || null,
        price: body.price,
        wholesale_price: body.wholesale_price,
        technician_price: body.technician_price,
        retail_price: body.retail_price,
        purchase_price: body.purchase_price,
        min_order_quantity: body.min_order_quantity || 1,
        stock_quantity: body.stock_quantity || 0,
        short_description: body.short_description || null,
        description: body.description || null,
        image_url: body.image_url || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        featured: body.featured || false,
      };
      if (isUuid) sbRecord.id = body.id;

      let res = await supabase.from("products").upsert([sbRecord], { onConflict: "slug" });
      if (res.error) {
        // Fallback without new price columns if column not in schema
        const basicRecord: Record<string, unknown> = {
          name: body.name,
          slug: body.slug,
          sku: body.sku,
          category_id: body.category_id || null,
          price: body.price,
          stock_quantity: body.stock_quantity || 0,
          short_description: body.short_description || null,
          description: body.description || null,
          image_url: body.image_url || null,
          is_active: body.is_active !== undefined ? body.is_active : true,
          featured: body.featured || false,
        };
        if (isUuid) basicRecord.id = body.id;
        await supabase.from("products").upsert([basicRecord], { onConflict: "slug" });
      }
    } catch {}

    return NextResponse.json({ success: true, product: body });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let id: string | undefined;
    let sku: string | undefined;
    let slug: string | undefined;
    let name: string | undefined;

    // Check query params
    const queryKey = req.nextUrl.searchParams.get("key") || req.nextUrl.searchParams.get("id");
    if (queryKey) id = queryKey;
    const querySku = req.nextUrl.searchParams.get("sku");
    if (querySku) sku = querySku;
    const querySlug = req.nextUrl.searchParams.get("slug");
    if (querySlug) slug = querySlug;
    const queryName = req.nextUrl.searchParams.get("name");
    if (queryName) name = queryName;

    // Check JSON body if provided
    try {
      const body = await req.json();
      if (body) {
        if (body.id) id = body.id;
        if (body.sku) sku = body.sku;
        if (body.slug) slug = body.slug;
        if (body.name) name = body.name;
      }
    } catch {}

    if (!id && !sku && !slug && !name) {
      return NextResponse.json({ success: false, error: "Missing ID or SKU or Slug or Name" }, { status: 400 });
    }

    const keysToAdd = new Set<string>();
    const registerKey = (val?: string | null) => {
      if (!val) return;
      const s = String(val).toLowerCase().trim();
      if (s) {
        keysToAdd.add(s);
        const clean = s.replace(/[^a-z0-9]/g, "");
        if (clean) keysToAdd.add(clean);
      }
    };

    registerKey(id);
    registerKey(sku);
    registerKey(slug);
    registerKey(name);

    // 1. Look up matching records in Supabase to collect all associated UUIDs, SKUs, Slugs, and Names
    try {
      const orConditions: string[] = [];
      if (id) orConditions.push(`id.eq.${id}`);
      if (sku) orConditions.push(`sku.eq.${sku}`);
      if (slug) orConditions.push(`slug.eq.${slug}`);
      if (name) orConditions.push(`name.ilike.%${name}%`);

      if (orConditions.length > 0) {
        const { data: matchedRows } = await supabase
          .from("products")
          .select("id, name, sku, slug")
          .or(orConditions.join(","));

        if (matchedRows && Array.isArray(matchedRows)) {
          for (const row of matchedRows) {
            registerKey(row.id);
            registerKey(row.name);
            registerKey(row.sku);
            registerKey(row.slug);
          }
        }
      }
    } catch (sbErr) {
      console.warn("Notice querying Supabase delete matches:", sbErr);
    }

    // 2. Look up matching records in DEFAULT_CATALOG_PRODUCTS
    const targetCleanName = name ? name.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const targetCleanSku = sku ? sku.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    for (const def of DEFAULT_CATALOG_PRODUCTS) {
      const defId = (def.id || "").toLowerCase().trim();
      const defSku = (def.sku || "").toLowerCase().trim();
      const defSlug = (def.slug || "").toLowerCase().trim();
      const defName = (def.name || "").toLowerCase().trim();
      const defCleanName = defName.replace(/[^a-z0-9]/g, "");
      const defCleanSku = defSku.replace(/[^a-z0-9]/g, "");

      const matches =
        (id && (defId === id.toLowerCase().trim() || defSlug === id.toLowerCase().trim() || defSku === id.toLowerCase().trim())) ||
        (sku && (defSku === sku.toLowerCase().trim() || (targetCleanSku && defCleanSku === targetCleanSku))) ||
        (slug && defSlug === slug.toLowerCase().trim()) ||
        (name && (defName === name.toLowerCase().trim() || (targetCleanName && defCleanName === targetCleanName)));

      if (matches) {
        registerKey(def.id);
        registerKey(def.name);
        registerKey(def.sku);
        registerKey(def.slug);
      }
    }

    // 3. Filter server custom products
    const customProducts = getServerCustomProducts();
    const filteredCustoms = customProducts.filter((p) => {
      const pId = (p.id || "").toLowerCase().trim();
      const pSku = (p.sku || "").toLowerCase().trim();
      const pSlug = (p.slug || "").toLowerCase().trim();
      const pName = (p.name || "").toLowerCase().trim();
      const pCleanName = pName.replace(/[^a-z0-9]/g, "");

      if (keysToAdd.has(pId) || keysToAdd.has(pSku) || keysToAdd.has(pSlug) || keysToAdd.has(pName) || keysToAdd.has(pCleanName)) {
        return false;
      }
      return true;
    });
    saveServerCustomProducts(filteredCustoms);

    // 4. Save all registered keys to data/deleted_products.json
    saveServerDeletedKey(Array.from(keysToAdd));

    // 5. Attempt direct delete in Supabase
    try {
      const isUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;
      if (isUuid && id) await supabase.from("products").delete().eq("id", id);
      if (slug) await supabase.from("products").delete().eq("slug", slug);
      if (sku) await supabase.from("products").delete().eq("sku", sku);
      if (name) await supabase.from("products").delete().eq("name", name);
    } catch {}

    return NextResponse.json({ success: true, deletedKeys: Array.from(keysToAdd) });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
