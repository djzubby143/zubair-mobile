import { supabase } from "@/lib/supabase";

export interface LiveCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  hasArrow?: boolean;
  subcategories?: string[];
}

// Complete base category catalog matching reference layout with realistic subcategories
export const DEFAULT_CATEGORIES: LiveCategory[] = [
  {
    id: "cat-sidekey",
    name: "Sidekey",
    slug: "sidekey",
    description: "Mobile side button plastic buttons, volume keys & power keys",
    subcategories: ["Power Key", "Volume Key", "Key Flex Ribbon", "SIM Tray"],
  },
  {
    id: "cat-lcd-units",
    name: "LCD & Touch Units",
    slug: "lcd-units",
    description: "Complete LCD touch assemblies and display panels",
    subcategories: ["Incell LCD", "TFT LCD", "LCD Unit", "Original OLED", "OG Quality"],
  },
  {
    id: "cat-charging-flex",
    name: "Charging Flex",
    slug: "charging-flex",
    description: "Charging sub-boards, ribbons, and mic modules",
    subcategories: ["IC Charging Flex", "Sub Board", "Charging Ribbon", "Mic Module"],
  },
  {
    id: "cat-charging-base",
    name: "Charging Base",
    slug: "charging-base",
    description: "USB-C, Micro-USB, and Lightning charging sockets",
    subcategories: ["Type-C Base", "V8 Micro USB Base", "iPhone Lightning Base"],
  },
  {
    id: "cat-oca-glass",
    name: "OCA Glass & Touch",
    slug: "oca-glass",
    description: "Front OCA glass, digitizers, and OCA sheets",
    subcategories: ["OCA Front Glass", "Touch Digitizer", "OCA Sheet", "Polarizer"],
  },
  {
    id: "cat-back-cover",
    name: "Back Cover",
    slug: "back-cover",
    description: "Glass, plastic, and metal back housings",
    subcategories: ["Glass Back Cover", "Plastic Back Housing", "Camera Lens Glass"],
  },
  {
    id: "cat-batteries",
    name: "Batteries & Housings",
    slug: "batteries-housings",
    description: "High-capacity replacement batteries and chassis",
    subcategories: ["Original Battery", "Middle Frame", "Full Body Housing"],
  },
  {
    id: "cat-chargers",
    name: "Charger",
    slug: "charger",
    description: "Fast chargers, adapters, and power bricks",
    subcategories: ["Super Fast Charger", "QC 3.0 Adapter", "PD Type-C Charger"],
  },
  {
    id: "cat-cables",
    name: "Cable",
    slug: "cable",
    description: "Fast data sync and charging cables",
    subcategories: ["Type-C Cable", "Micro USB Cable", "Lightning Cable", "6A Fast Cable"],
  },
  {
    id: "cat-car-charger",
    name: "Car Charger",
    slug: "car-charger",
    description: "12V-24V high-speed car power plugs",
    subcategories: ["Dual USB Car Charger", "Fast PD Car Plug"],
  },
  {
    id: "cat-board-gripper",
    name: "Board Gripper",
    slug: "board-gripper",
    description: "PCB holding clamps and motherboard fixtures",
    subcategories: ["Universal PCB Fixture", "Double Bearing Clamp"],
  },
  {
    id: "cat-heatgun",
    name: "Heatgun",
    slug: "heatgun",
    description: "SMD hot air rework stations and heatguns",
    subcategories: ["SMD Rework Station", "Digital Hot Air Gun", "Nozzles"],
  },
  {
    id: "cat-iron-stand",
    name: "Iron Stand",
    slug: "iron-stand",
    description: "Soldering iron holders and cleaning sponges",
    subcategories: ["Heavy Iron Stand", "Brass Wire Cleaner"],
  },
  {
    id: "cat-jumper-wire",
    name: "Jumper Wire",
    slug: "jumper-wire",
    description: "Ultra-fine copper jumper wire for micro-soldering",
    subcategories: ["0.01mm Insulated Wire", "0.02mm Flying Wire"],
  },
  {
    id: "cat-separator",
    name: "Separator",
    slug: "separator",
    description: "LCD vacuum heating separator machines",
    subcategories: ["Vacuum Separator 7-inch", "Heating Plate Machine"],
  },
  {
    id: "cat-speaker",
    name: "Speaker",
    slug: "speaker",
    description: "Ringer loud speakers and ear speakers",
    subcategories: ["Loud Speaker Ringer", "Ear Speaker Earpiece"],
  },
  {
    id: "cat-touch",
    name: "Touch",
    slug: "touch",
    description: "Touch screen digitizer glass",
    subcategories: ["Universal Touch Digitizer", "Touch Sensor Glass"],
  },
  {
    id: "cat-dot-units",
    name: "Dot Units",
    slug: "dot-units",
    description: "Dot display units and test assemblies",
    subcategories: ["Dot LCD Unit", "Testing Module"],
  },
  {
    id: "cat-repair-tools",
    name: "Repair Tools & Supplies",
    slug: "repair-tools",
    description: "Opening picks, tweezers, screwdrivers, UV glue",
    subcategories: ["Screwdriver Kit", "UV Glue & Lamp", "Precision Tweezers", "Suction Cup"],
  },
];

export const STORAGE_KEY_CATEGORIES = "zubair_mobile_categories";
export const STORAGE_KEY_SUBCATS = "zubair_mobile_subcategories_map";

/**
 * Fetch all categories merged from Supabase + localStorage + Defaults
 * Guaranteeing no duplicates, preserving subcategories.
 */
export async function getLiveCategories(): Promise<LiveCategory[]> {
  const map = new Map<string, LiveCategory>();

  // 1. Load Defaults first
  for (const item of DEFAULT_CATEGORIES) {
    map.set(item.name.trim().toLowerCase(), {
      ...item,
      subcategories: item.subcategories ? [...item.subcategories] : [],
    });
  }

  // 2. Load subcategory overrides map from localStorage
  let subcatMap: Record<string, string[]> = {};
  if (typeof window !== "undefined") {
    try {
      const storedMap = localStorage.getItem(STORAGE_KEY_SUBCATS);
      if (storedMap) {
        subcatMap = JSON.parse(storedMap);
      }
    } catch (e) {
      console.warn("Notice reading subcategories map:", e);
    }
  }

  // 3. Load from localStorage if present in browser
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (stored) {
        const parsed: LiveCategory[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.name) {
              const key = item.name.trim().toLowerCase();
              const existing = map.get(key);
              map.set(key, {
                id: item.id || existing?.id || `local-${key}`,
                name: item.name.trim(),
                slug: item.slug || key.replace(/\s+/g, "-"),
                description: item.description || existing?.description || null,
                subcategories:
                  item.subcategories && item.subcategories.length > 0
                    ? item.subcategories
                    : subcatMap[key] || existing?.subcategories || [],
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Error reading local categories:", err);
    }
  }

  // 4. Load from Supabase Database
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      for (const item of data) {
        if (item && item.name) {
          const key = item.name.trim().toLowerCase();
          const existing = map.get(key);
          map.set(key, {
            id: item.id,
            name: item.name.trim(),
            slug: item.slug || key.replace(/\s+/g, "-"),
            description: item.description || existing?.description || null,
            subcategories:
              item.subcategories || subcatMap[key] || existing?.subcategories || [],
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

  // Apply subcat overrides
  for (const [catKey, subList] of Object.entries(subcatMap)) {
    const existing = map.get(catKey.toLowerCase());
    if (existing) {
      existing.subcategories = subList;
    }
  }

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

    // Also persist subcategories map
    const subcatMap: Record<string, string[]> = {};
    for (const cat of updatedList) {
      if (cat.name && cat.subcategories) {
        subcatMap[cat.name.trim().toLowerCase()] = cat.subcategories;
      }
    }
    localStorage.setItem(STORAGE_KEY_SUBCATS, JSON.stringify(subcatMap));

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_category_updated", { detail: updatedList }));
  } catch (err) {
    console.error("Failed to broadcast category change:", err);
  }
}
