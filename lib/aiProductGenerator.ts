/**
 * AI Product Assistant for Zubair Mobile
 * Generates SEO descriptions, specifications, warranty guidelines, and studio product images.
 */

export interface ProductAIGenerateInput {
  name: string;
  brand?: string;
  model?: string;
  partType?: string;
  qualityGrade?: "Original" | "OEM" | "High Copy" | "Copy" | string;
  warranty?: string;
  compatibleModels?: string;
}

export interface ProductAIDescriptionResult {
  shortDescription: string;
  description: string;
  suggestedTitle?: string;
  suggestedSku?: string;
  keyFeatures: string[];
}

export interface ProductAIImageResult {
  imageUrl: string;
  prompt: string;
  provider: "gemini" | "pollinations" | "catalog_studio";
}

/**
 * Clean & Format Part Title
 */
export function formatAITitle(input: ProductAIGenerateInput): string {
  const brand = input.brand || "Mobile";
  const model = input.model ? input.model.toUpperCase() : "";
  const partType = input.partType || "Spare Part";
  const grade = input.qualityGrade ? `[${input.qualityGrade}]` : "[Original]";

  if (input.name && input.name.length > 5) {
    return input.name.trim();
  }
  return `${brand} ${model} ${partType} ${grade}`.replace(/\s+/g, " ").trim();
}

/**
 * Generate Intelligent E-Commerce Description
 */
export async function generateAIDescription(
  input: ProductAIGenerateInput
): Promise<ProductAIDescriptionResult> {
  const brand = input.brand || "Smartphone";
  const model = input.model || (input.name.split(" ")[1] || "");
  const partType = input.partType || "Replacement Component";
  const grade = input.qualityGrade || "Original";
  const warranty = input.warranty && input.warranty !== "No Warranty" ? input.warranty : "Checking Warranty";
  const comp = input.compatibleModels || (model ? `${model}, SM-${model}` : "Standard Models");

  // Check if Gemini API key exists
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const promptText = `You are an expert mobile phone hardware technician and e-commerce copywriter for Zubair Mobile (Pakistan's premier mobile spare parts wholesaler).
Write a professional, high-converting product description for:
- Product Title: ${input.name}
- Brand: ${brand}
- Model: ${model}
- Part Type: ${partType}
- Quality Grade: ${grade}
- Warranty: ${warranty}
- Compatible Models: ${comp}

Respond strictly in JSON format with two keys:
{
  "shortDescription": "1-line crisp highlight in English",
  "description": "Comprehensive markdown description including Overview, Technical Specifications, Compatibility List, Quality & Testing Guarantee, and Technician Installation / Testing Advice",
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const cleanedJson = rawJson.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedJson);
          return {
            shortDescription: typeof parsed.shortDescription === "string" ? parsed.shortDescription.trim() : "",
            description: typeof parsed.description === "string" ? parsed.description.trim() : "",
            keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
            suggestedTitle: formatAITitle(input),
            suggestedSku: `ZB-${brand.slice(0, 3).toUpperCase()}-${model.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "GEN"}-${partType.slice(0, 3).toUpperCase()}`,
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to local expert template:", err);
    }
  }

  // Built-in High Quality Specialized Spare Parts Template Engine
  let partSpecificText = "";
  let techSpecs = "";

  switch (partType.toLowerCase()) {
    case "lcd unit":
    case "screen":
      partSpecificText = `High-definition vivid color display assembly with responsive multi-touch digitizer, authentic refresh rate, and anti-fingerprint oleophobic coating. Engineered to replace broken, bleeding, unresponsive, or cracked screens.`;
      techSpecs = `- **Display Technology**: Premium Grade ${grade} Multi-Touch Panel\n- **Resolution**: Factory Standard HD+/FHD+ Native Rendering\n- **Touch Digitizer**: Ultra-responsive zero-latency touch sensor\n- **Connector**: Precision gold-plated flex cable ribbon`;
      break;
    case "battery":
      partSpecificText = `High-capacity lithium-ion replacement battery equipped with internal IC protection to guard against overcharging, overheating, and short-circuiting. Restores original battery backup and endurance.`;
      techSpecs = `- **Cell Chemistry**: Grade-A Lithium-Ion / Li-Po Rechargeable\n- **Safety Circuit**: Dual IC Overload & Thermal Protection\n- **Cycle Life**: 500+ Full Charge-Discharge Cycles\n- **Connector**: OEM specification snap connector`;
      break;
    case "charging flex":
    case "charging board":
      partSpecificText = `Complete sub-board charging flex assembly featuring micro-USB / Type-C port, integrated microphone, network antenna terminal, and fast-charge pass-through.`;
      techSpecs = `- **Port Type**: Reinforced Type-C / Micro-USB Jack\n- **Components**: High-clarity voice microphone & RF antenna switch\n- **Fast Charging**: Quick Charge / Dash / VOOC protocol compatible\n- **PCB Quality**: Multi-layer fiber circuit board`;
      break;
    case "camera":
    case "camera module":
      partSpecificText = `Factory-calibrated replacement camera module offering autofocus, crisp low-light sensitivity, and stable video recording. Replaces blurry, scratched, or malfunctioning sensors.`;
      techSpecs = `- **Sensor**: High-resolution CMOS Image Sensor\n- **Focus**: High-speed Auto Focus (AF) Mechanism\n- **Flex**: Tear-resistant flexible flat cable (FFC)\n- **Lens**: Multi-coated anti-scratch glass optics`;
      break;
    case "oca glass":
    case "touch glass":
      partSpecificText = `Scratch-resistant front outer glass replacement with pre-applied optically clear adhesive (OCA) film for separation and lamination refurbishment.`;
      techSpecs = `- **Material**: Corning Gorilla / 9H Tempered Hardened Glass\n- **Coating**: Hydrophobic and Oleophobic smooth glide layer\n- **Adhesive**: High-transparency optical bubble-free OCA film`;
      break;
    default:
      partSpecificText = `Professional grade replacement component manufactured according to strict electronic tolerances to ensure seamless integration and durability.`;
      techSpecs = `- **Standard**: Grade ${grade} Manufacturing Standard\n- **Testing**: Pre-delivery bench tested for continuity\n- **Compatibility**: 100% pin-compatible replacement`;
      break;
  }

  const shortDescription = `${grade} ${brand} ${model} ${partType} – 100% tested and verified replacement component with optimal performance and durability.`;

  const description = `### 📱 Product Overview
${partSpecificText}

---

### ⚙️ Technical Specifications
${techSpecs}
- **Quality Grade**: **${grade}**
- **Brand**: ${brand}
- **Target Device**: ${model || brand}
- **Condition**: Brand New & Factory Sealed

---

### 🔍 Verified Model Compatibility
- Compatible with: **${comp}**
- Please inspect your device's motherboard revision or model code before permanent installation.

---

### 🛡️ Quality Assurance & Testing
Every unit sold by **Zubair Mobile** undergoes rigorous quality checks:
1. Checked for physical defects and ribbon integrity.
2. Verified for full electronic continuity and fitment.
3. Protected in multi-layer anti-static bubble packaging for safe transport across Pakistan.

---

### ⚠️ Technician Installation & Warranty Advice
- **Dry Test Before Installation**: Connect the flex cables and test full functionality (display, touch, charging, audio) **BEFORE** applying B-7000/T-7000 glue or removing the factory protective warranty sticker.
- **Warranty**: ${warranty}. Once warranty plastic or stickers are peeled off, items cannot be returned or replaced.
- Professional installation by a qualified mobile repair technician is strongly recommended.`;

  const keyFeatures = [
    `Grade ${grade} Guaranteed Quality`,
    `Fully compatible with ${brand} ${model}`,
    `Tested before dispatch to ensure zero defects`,
    `Protected in safe anti-static shipping pack`,
  ];

  const suggestedSku = `ZB-${brand.slice(0, 3).toUpperCase()}-${model.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "GEN"}-${partType.slice(0, 3).toUpperCase()}`;

  return {
    shortDescription,
    description,
    suggestedTitle: formatAITitle(input),
    suggestedSku,
    keyFeatures,
  };
}

/**
 * Generate AI Studio Product Image
 */
export async function generateAIProductImage(
  input: ProductAIGenerateInput
): Promise<ProductAIImageResult> {
  const brand = input.brand || "Mobile";
  const model = input.model || "";
  const partType = input.partType || "Spare Part";
  const grade = input.qualityGrade || "Original";

  // Build clean commercial studio photography prompt
  const cleanPrompt = `commercial studio product photograph of ${brand} ${model} ${partType} mobile replacement spare part ${grade}, crisp details, front view, isolated on solid pure white background, professional photography, soft studio lighting, sharp focus, 8k resolution, minimalist electronics catalog shot`;

  // Use Pollinations AI free neural generator with cache-busting seed
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&seed=${seed}`;

  return {
    imageUrl: pollinationsUrl,
    prompt: cleanPrompt,
    provider: "pollinations",
  };
}
