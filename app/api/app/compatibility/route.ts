import { NextRequest, NextResponse } from "next/server";
import { getSupportedDevices, getDeviceParts } from "@/lib/compatibility";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts } from "@/lib/customProducts";
import { sanitizeProductListForTier } from "@/lib/pricingSecurity";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("device_id");
    const brand = searchParams.get("brand");
    const tierParam = searchParams.get("tier");
    const tier = (tierParam === "wholesale" || tierParam === "technician" || tierParam === "retail")
      ? tierParam
      : "retail";

    const devices = await getSupportedDevices();

    // If no specific device requested, return device models
    if (!deviceId) {
      const filtered = brand
        ? devices.filter((d) => d.brand.toLowerCase() === brand.toLowerCase())
        : devices;
      return NextResponse.json({
        success: true,
        devices: filtered,
      });
    }

    // Lookup device
    const targetDevice = devices.find(
      (d) =>
        d.id === deviceId ||
        (d.model_name && d.model_name.toLowerCase() === deviceId.toLowerCase()) ||
        (d.model && d.model.toLowerCase() === deviceId.toLowerCase()) ||
        (d.model_code && d.model_code.toLowerCase() === deviceId.toLowerCase())
    );

    if (!targetDevice) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }

    // Load catalog and sanitize
    let products: any[] = [];
    const { data } = await supabase.from("products").select("*, category:categories(*)");
    if (data && data.length > 0) {
      products = data;
    } else {
      products = [...getCustomProducts(), ...DEFAULT_CATALOG_PRODUCTS];
    }
    const sanitized = sanitizeProductListForTier(products, tier);

    // Group parts
    const categorizedParts = getDeviceParts(targetDevice, sanitized);

    return NextResponse.json({
      success: true,
      tier,
      device: targetDevice,
      categories: categorizedParts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
