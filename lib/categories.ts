import { supabase } from "@/lib/supabase";

export interface LiveCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  hasArrow?: boolean;
}

// Complete base category catalog matching reference layout and inventory
export const DEFAULT_CATEGORIES: LiveCategory[] = [
  { id: "cat-sidekey", name: "Sidekey", slug: "sidekey", description: "Mobile side button plastic buttons and keys" },
  { id: "cat-lcd-units", name: "LCD & Touch Units", slug: "lcd-units", description: "Complete LCD touch assemblies and display panels" },
  { id: "cat-charging-flex", name: "Charging Flex", slug: "charging-flex", description: "Charging sub-boards, ribbons, and mic modules" },
  { id: "cat-charging-base", name: "Charging Base", slug: "charging-base", description: "USB-C, Micro-USB, and Lightning charging sockets" },
  { id: "cat-oca-glass", name: "OCA Glass & Touch", slug: "oca-glass", description: "Front OCA glass, digitizers, and OCA sheets" },
  { id: "cat-back-cover", name: "Back Cover", slug: "back-cover", description: "Glass, plastic, and metal back housings" },
  { id: "cat-batteries", name: "Batteries & Housings", slug: "batteries-housings", description: "High-capacity replacement batteries and chassis" },
  { id: "cat-chargers", name: "Charger", slug: "charger", description: "Fast chargers, adapters, and power bricks" },
  { id: "cat-cables", name: "Cable", slug: "cable", description: "Fast data sync and charging cables" },
  { id: "cat-car-charger", name: "Car Charger", slug: "car-charger", description: "12V-24V high-speed car power plugs" },
  { id: "cat-board-gripper", name: "Board Gripper", slug: "board-gripper", description: "PCB holding clamps and motherboard fixtures" },
  { id: "cat-heatgun", name: "Heatgun", slug: "heatgun", description: "SMD hot air rework stations and heatguns" },
  { id: "cat-iron-stand", name: "Iron Stand", slug: "iron-stand", description: "Soldering iron holders and cleaning sponges" },
  { id: "cat-jumper-wire", name: "Jumper Wire", slug: "jumper-wire", description: "Ultra-fine copper jumper wire for micro-soldering" },
  { id: "cat-separator", name: "Separator", slug: "separator", description: "LCD vacuum heating separator machines" },
  { id: "cat-speaker", name: "Speaker", slug: "speaker", description: "Ringer loud speakers and ear speakers" },
  { id: "cat-touch", name: "Touch", slug: "touch", description: "Touch screen digitizer glass" },
  { id: "cat-dot-units", name: "Dot Units", slug: "dot-units", description: "Dot display units and test assemblies" },
  { id: "cat-repair-tools", name: "Repair Tools & Supplies", slug: "repair-tools", description: "Opening picks, tweezers, screwdrivers, UV glue" },
];

export const STORAGE_KEY_CATEGORIES = "zubair_mobile_categories";

/**
 * Fetch all categories merged from Supabase + localStorage + Defaults
 * Guaranteeing no duplicates and case-insensitive uniqueness.
 */
export async function getLiveCategories(): Promise<LiveCategory[]> {
  const map = new Map<string, LiveCategory>();

  // 1. Load Defaults first
  for (const item of DEFAULT_CATEGORIES) {
    map.set(item.name.trim().toLowerCase(), item);
  }

  // 2. Load from localStorage if present in browser
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (stored) {
        const parsed: LiveCategory[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.name) {
              const key = item.name.trim().toLowerCase();
              map.set(key, {
                id: item.id || `local-${key}`,
                name: item.name.trim(),
                slug: item.slug || key.replace(/\s+/g, "-"),
                description: item.description || null,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Error reading local categories:", err);
    }
  }

  // 3. Load from Supabase Database
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      for (const item of data) {
        if (item && item.name) {
          const key = item.name.trim().toLowerCase();
          map.set(key, {
            id: item.id,
            name: item.name.trim(),
            slug: item.slug || key.replace(/\s+/g, "-"),
            description: item.description || null,
          });
        }
      }

      // Sync latest Supabase list back to localStorage
      if (typeof window !== "undefined") {
        const fullList = Array.from(map.values());
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(fullList));
      }
    }
  } catch (err) {
    console.warn("Notice fetching Supabase categories:", err);
  }

  // Priority sort: newly created or active categories, with Sidekey and main parts prominent
  const result = Array.from(map.values());
  return result;
}

/**
 * Broadcast when a category is added/updated/deleted from Admin
 */
export function broadcastCategoryChange(updatedList: LiveCategory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updatedList));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_category_updated", { detail: updatedList }));
  } catch (err) {
    console.error("Failed to broadcast category change:", err);
  }
}
