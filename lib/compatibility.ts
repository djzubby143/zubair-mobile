import { supabase } from "@/lib/supabase";
import { Product, CompatibilityDevice, SparePartCategory } from "@/lib/types";

export const STORAGE_KEY_COMPATIBILITY = "zubair_mobile_compatibility";

export const DEFAULT_COMPATIBILITY_DEVICES: CompatibilityDevice[] = [
  {
    id: "dev-apple-11",
    brand: "Apple",
    model: "iPhone 11",
    series: "iPhone Series",
    release_year: 2019,
    compatible_models_alias: ["A2111", "A2223", "A2221", "iPhone 11 Normal"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-apple-11pro",
    brand: "Apple",
    model: "iPhone 11 Pro",
    series: "iPhone Series",
    release_year: 2019,
    compatible_models_alias: ["A2160", "A2217", "A2215"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-apple-12",
    brand: "Apple",
    model: "iPhone 12",
    series: "iPhone Series",
    release_year: 2020,
    compatible_models_alias: ["A2172", "A2402", "A2404"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-apple-13",
    brand: "Apple",
    model: "iPhone 13",
    series: "iPhone Series",
    release_year: 2021,
    compatible_models_alias: ["A2482", "A2631", "A2634"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-sam-a12",
    brand: "Samsung",
    model: "Galaxy A12",
    series: "Galaxy A Series",
    release_year: 2020,
    compatible_models_alias: ["A125F", "A127F", "M127F", "A12 Nacho", "M12"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-sam-a52",
    brand: "Samsung",
    model: "Galaxy A52",
    series: "Galaxy A Series",
    release_year: 2021,
    compatible_models_alias: ["A525F", "A526B", "A52s 5G"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-sam-a32",
    brand: "Samsung",
    model: "Galaxy A32",
    series: "Galaxy A Series",
    release_year: 2021,
    compatible_models_alias: ["A325F", "A326B"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-vivo-y20",
    brand: "Vivo",
    model: "Vivo Y20",
    series: "Y Series",
    release_year: 2020,
    compatible_models_alias: ["V2029", "V2027", "Y20i", "Y20s", "Y21", "Y33S", "Y17S", "Y22"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-vivo-v20",
    brand: "Vivo",
    model: "Vivo V20",
    series: "V Series",
    release_year: 2020,
    compatible_models_alias: ["V2024", "V2025"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-oppo-f11",
    brand: "Oppo",
    model: "Oppo F11",
    series: "F Series",
    release_year: 2019,
    compatible_models_alias: ["CPH1911", "CPH1969", "F11 Pro"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-oppo-a54",
    brand: "Oppo",
    model: "Oppo A54",
    series: "A Series",
    release_year: 2021,
    compatible_models_alias: ["CPH2239"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-infinix-hot10",
    brand: "Infinix",
    model: "Infinix Hot 10",
    series: "Hot Series",
    release_year: 2020,
    compatible_models_alias: ["X682B", "X682C", "Hot 10 Play", "Hot 10i"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-infinix-note11",
    brand: "Infinix",
    model: "Infinix Note 11",
    series: "Note Series",
    release_year: 2021,
    compatible_models_alias: ["X663", "X663B"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-xiaomi-redmi9",
    brand: "Xiaomi",
    model: "Redmi 9",
    series: "Redmi Series",
    release_year: 2020,
    compatible_models_alias: ["M2004J19G", "Redmi 9A", "Redmi 9C"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-xiaomi-note10",
    brand: "Xiaomi",
    model: "Redmi Note 10",
    series: "Redmi Note Series",
    release_year: 2021,
    compatible_models_alias: ["M2101K7AI", "M2101K7AG", "Redmi Note 10 Pro"],
    image_url: "/placeholder-phone.png",
  },
  {
    id: "dev-tecno-spark6",
    brand: "Tecno",
    model: "Tecno Spark 6",
    series: "Spark Series",
    release_year: 2020,
    compatible_models_alias: ["KE7", "Spark 6 Go", "Spark 6 Air"],
    image_url: "/placeholder-phone.png",
  },
];

/**
 * Fetch list of known mobile device models
 */
export async function getCompatibilityDevices(): Promise<CompatibilityDevice[]> {
  try {
    const { data, error } = await supabase
      .from("compatibility")
      .select("*")
      .order("brand", { ascending: true });

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COMPATIBILITY, JSON.stringify(data));
      }
      return data as CompatibilityDevice[];
    }
  } catch (err) {
    console.warn("Supabase compatibility fetch error, using defaults:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPATIBILITY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  return DEFAULT_COMPATIBILITY_DEVICES;
}

export interface DevicePartsGroup {
  category: SparePartCategory;
  count: number;
  products: Product[];
}

/**
 * Given a device (or search string for a device), locate all matching spare parts
 * grouped cleanly by component type: LCD, Battery, Charging Flex, Camera, Glass, IC, etc.
 */
export function getCompatiblePartsForDevice(
  device: CompatibilityDevice | string,
  allProducts: Product[]
): {
  deviceInfo: { brand: string; model: string; series?: string; aliases: string[] };
  groups: DevicePartsGroup[];
  totalParts: number;
} {
  let targetModel = "";
  let targetBrand = "";
  let aliases: string[] = [];
  let series = "";

  if (typeof device === "string") {
    targetModel = device.trim().toLowerCase();
    // Try to locate in known list
    const found = DEFAULT_COMPATIBILITY_DEVICES.find(
      (d) =>
        d.model.toLowerCase() === targetModel ||
        d.compatible_models_alias?.some((a) => a.toLowerCase() === targetModel)
    );
    if (found) {
      targetModel = found.model;
      targetBrand = found.brand;
      series = found.series || "";
      aliases = found.compatible_models_alias || [];
    } else {
      aliases = [targetModel];
    }
  } else {
    targetModel = device.model;
    targetBrand = device.brand;
    series = device.series || "";
    aliases = [device.model, ...(device.compatible_models_alias || [])];
  }

  // Tokenize model keywords for fuzzy matching
  const searchTerms = [
    targetModel.toLowerCase(),
    ...aliases.map((a) => a.toLowerCase().trim()),
  ].filter(Boolean);

  // Group buckets
  const categoryMap: { [cat in SparePartCategory]: Product[] } = {
    "LCD Unit": [],
    "Battery": [],
    "Charging Flex": [],
    "Camera": [],
    "OCA Glass": [],
    "IC Parts": [],
    "Side Key": [],
    "Housing / Body": [],
    "Speaker / Ringer": [],
  };

  for (const product of allProducts) {
    if (product.is_active === false) continue;

    const pName = (product.name || "").toLowerCase();
    const pModel = (product.model || "").toLowerCase();
    const pBrand = (product.brand || "").toLowerCase();
    const pComp = Array.isArray(product.compatible_models)
      ? product.compatible_models.join(" ").toLowerCase()
      : (product.compatible_models || "").toLowerCase();
    const pSku = (product.sku || "").toLowerCase();

    // Determine if product matches target model or any alias
    const matchesModel = searchTerms.some((term) => {
      // Clean term
      const cleanTerm = term.replace(/^(samsung|apple|vivo|oppo|infinix|tecno|xiaomi|realme)\s+/i, "");
      return (
        pName.includes(term) ||
        pName.includes(cleanTerm) ||
        pModel.includes(cleanTerm) ||
        pComp.includes(cleanTerm) ||
        pSku.includes(cleanTerm)
      );
    });

    if (!matchesModel) continue;

    // Filter by Brand if known
    if (targetBrand && pBrand && pBrand !== targetBrand.toLowerCase()) {
      continue;
    }

    // Determine Part Category
    const pType = (product.part_type || product.category?.name || "").toLowerCase();

    if (pType.includes("lcd") || pType.includes("unit") || pType.includes("screen") || pName.includes("lcd") || pName.includes("unit")) {
      categoryMap["LCD Unit"].push(product);
    } else if (pType.includes("battery") || pName.includes("battery") || pName.includes("cell")) {
      categoryMap["Battery"].push(product);
    } else if (pType.includes("charging") || pType.includes("flex") || pName.includes("charging") || pName.includes("pin flex")) {
      categoryMap["Charging Flex"].push(product);
    } else if (pType.includes("camera") || pName.includes("camera") || pName.includes("lens")) {
      categoryMap["Camera"].push(product);
    } else if (pType.includes("glass") || pType.includes("oca") || pName.includes("glass") || pName.includes("touch")) {
      categoryMap["OCA Glass"].push(product);
    } else if (pType.includes("key") || pType.includes("button") || pName.includes("side key") || pName.includes("volume")) {
      categoryMap["Side Key"].push(product);
    } else if (pType.includes("ic") || pName.includes("power ic") || pName.includes("charging ic")) {
      categoryMap["IC Parts"].push(product);
    } else if (pType.includes("housing") || pType.includes("body") || pName.includes("back cover") || pName.includes("body")) {
      categoryMap["Housing / Body"].push(product);
    } else {
      categoryMap["LCD Unit"].push(product);
    }
  }

  const groups: DevicePartsGroup[] = Object.entries(categoryMap)
    .filter(([_, prods]) => prods.length > 0)
    .map(([cat, prods]) => ({
      category: cat as SparePartCategory,
      count: prods.length,
      products: prods,
    }));

  const totalParts = groups.reduce((sum, g) => sum + g.count, 0);

  return {
    deviceInfo: {
      brand: targetBrand || "Generic",
      model: targetModel,
      series,
      aliases,
    },
    groups,
    totalParts,
  };
}

/**
 * Convenience aliases for device compatibility components
 */
export const getSupportedDevices = async (): Promise<CompatibilityDevice[]> => {
  const devices = await getCompatibilityDevices();
  return devices.map((d) => ({
    ...d,
    model_name: d.model_name || d.model,
    model_code: d.model_code || (d.compatible_models_alias && d.compatible_models_alias[0]) || d.model,
  }));
};

export function getDeviceParts(
  device: CompatibilityDevice,
  products: Product[]
): { [category: string]: Product[] } {
  const result = getCompatiblePartsForDevice(device, products);
  const map: { [category: string]: Product[] } = {};
  for (const group of result.groups) {
    map[group.category] = group.products;
  }
  return map;
}

export function registerDeviceModel(device: CompatibilityDevice): CompatibilityDevice {
  const newDev: CompatibilityDevice = {
    ...device,
    model: device.model || device.model_name || "Device",
    model_name: device.model_name || device.model,
    compatible_models_alias: device.compatible_models_alias || device.aliases || [],
  };
  DEFAULT_COMPATIBILITY_DEVICES.unshift(newDev);
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPATIBILITY);
      const list = stored ? JSON.parse(stored) : DEFAULT_COMPATIBILITY_DEVICES;
      localStorage.setItem(STORAGE_KEY_COMPATIBILITY, JSON.stringify([newDev, ...list]));
    } catch {}
  }
  return newDev;
}
