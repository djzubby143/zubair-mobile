import { NextRequest, NextResponse } from "next/server";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import {
  getServerCustomProducts,
  saveServerCustomProducts,
  saveServerDeletedKey,
} from "@/lib/serverProducts";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const custom = getServerCustomProducts();
    const found =
      custom.find((p) => p.id === id || p.sku === id) ||
      DEFAULT_CATALOG_PRODUCTS.find((p) => p.id === id || p.sku === id);

    if (found) {
      return NextResponse.json({ success: true, product: found });
    }

    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .or(`id.eq.${id},sku.eq.${id}`)
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({ success: true, product: data });
    }

    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();

    const customProducts = getServerCustomProducts();
    const idx = customProducts.findIndex(
      (p) => p.id === id || (p.sku && p.sku.toLowerCase() === id.toLowerCase())
    );

    let updatedProd: Product;
    if (idx !== -1) {
      customProducts[idx] = {
        ...customProducts[idx],
        ...body,
        updated_at: new Date().toISOString(),
      };
      updatedProd = customProducts[idx];
      saveServerCustomProducts(customProducts);
    } else {
      // Find in catalog
      const def = DEFAULT_CATALOG_PRODUCTS.find(
        (p) => p.id === id || (p.sku && p.sku.toLowerCase() === id.toLowerCase())
      );
      if (def) {
        updatedProd = {
          ...def,
          ...body,
          updated_at: new Date().toISOString(),
        };
        customProducts.unshift(updatedProd);
        saveServerCustomProducts(customProducts);
      } else {
        // Try fetching from supabase to update
        const { data: sbProd } = await supabase
          .from("products")
          .select("*")
          .or(`id.eq.${id},sku.eq.${id}`)
          .maybeSingle();

        if (sbProd) {
          updatedProd = {
            ...sbProd,
            ...body,
            updated_at: new Date().toISOString(),
          };
          customProducts.unshift(updatedProd);
          saveServerCustomProducts(customProducts);
        } else {
          return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }
      }
    }

    // Also update Supabase
    try {
      await supabase
        .from("products")
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${id},sku.eq.${id}`);
    } catch (sbErr) {
      console.warn("Supabase product PATCH warning:", sbErr);
    }

    return NextResponse.json({ success: true, product: updatedProd });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(req, { params });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    saveServerDeletedKey(id);

    const customProducts = getServerCustomProducts();
    const filtered = customProducts.filter((p) => p.id !== id && p.sku !== id);
    saveServerCustomProducts(filtered);

    try {
      await supabase.from("products").delete().or(`id.eq.${id},sku.eq.${id}`);
    } catch {}

    return NextResponse.json({ success: true, message: `Product ${id} deleted successfully` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
