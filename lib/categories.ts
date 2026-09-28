import { supabase } from "@/lib/supabase";

export interface LiveCategory {
  id: string;
  name: string;
  slug: string;
  subcategories: string[];
  description?: string; // Add this line
}

export const DEFAULT_CATEGORIES: LiveCategory[] = [
  { id: "cat-1", name: "LCD", slug: "lcd", subcategories: ["Original", "Unit", "In Cell", "TFT", "LED/OLED"] },
  { id: "cat-2", name: "Charging Flex", slug: "charging-flex", subcategories: ["IC", "Original"] },
  { id: "cat-3", name: "Volume Flex", slug: "volume-flex", subcategories: ["On/OFF", "Volume"] },
  { id: "cat-4", name: "OCA Glass", slug: "oca-glass", subcategories: [] },
  { id: "cat-5", name: "Mobile Body", slug: "mobile-body", subcategories: ["Original"] },
  { id: "cat-6", name: "Mobile Back", slug: "mobile-back", subcategories: [] },
  { id: "cat-7", name: "Side key", slug: "side-key", subcategories: [] },
  { id: "cat-8", name: "Camera Glass", slug: "camera-glass", subcategories: [] },
  { id: "cat-9", name: "Charging Base", slug: "charging-base", subcategories: ["C-Type", "Micro"] },
  { id: "cat-10", name: "Battery", slug: "battery", subcategories: [] },
  { id: "cat-11", name: "IC's", slug: "ics", subcategories: [] },
  { id: "cat-12", name: "Tool's", slug: "tools", subcategories: [] }
];

export async function getLiveCategories(): Promise<LiveCategory[]> {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    // Format the Supabase data and ensure id/slug always exist
    return data.map((item: any) => ({
      id: item.id || `cat-${Math.random().toString(36).substring(2, 9)}`,
      name: item.name,
      slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subcategories: Array.isArray(item.subcategories) ? item.subcategories : []
    }));
  } catch (err) {
    console.warn("Falling back to default categories:", err);
    return DEFAULT_CATEGORIES;
  }
}

export function broadcastCategoryChange(updatedCategories?: LiveCategory[]) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zubair_category_updated", { detail: updatedCategories }));
  }
}