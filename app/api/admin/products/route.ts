import { NextRequest, NextResponse } from "next/server";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
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

    const normId = (id || "").toLowerCase().trim();
    const normSku = (sku || "").toLowerCase().trim();
    const normSlug = (slug || "").toLowerCase().trim();
    const normName = (name || "").toLowerCase().trim();

    const customProducts = getServerCustomProducts();
    const filtered = customProducts.filter((p) => {
      const pId = (p.id || "").toLowerCase().trim();
      const pSku = (p.sku || "").toLowerCase().trim();
      const pSlug = (p.slug || "").toLowerCase().trim();
      const pName = (p.name || "").toLowerCase().trim();
      if (normId && pId === normId) return false;
      if (normSku && pSku === normSku) return false;
      if (normSlug && pSlug === normSlug) return false;
      if (normName && pName === normName) return false;
      return true;
    });
    saveServerCustomProducts(filtered);

    if (id) saveServerDeletedKey(id);
    if (sku) saveServerDeletedKey(sku);
    if (slug) saveServerDeletedKey(slug);
    if (name) saveServerDeletedKey(name);

    // Try Supabase delete
    try {
      const isUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;
      if (isUuid && id) {
        await supabase.from("products").delete().eq("id", id);
      }
      if (slug) {
        await supabase.from("products").delete().eq("slug", slug);
      }
      if (sku) {
        await supabase.from("products").delete().eq("sku", sku);
      }
      if (name) {
        await supabase.from("products").delete().eq("name", name);
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
