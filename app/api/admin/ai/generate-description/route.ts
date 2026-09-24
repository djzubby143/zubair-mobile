import { NextRequest, NextResponse } from "next/server";
import { generateAIDescription, ProductAIGenerateInput } from "@/lib/aiProductGenerator";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`ai-desc-${ip}`, { limit: 15, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many AI generation requests. Please wait a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body: ProductAIGenerateInput = await req.json();

    if (!body || (!body.name && !body.partType)) {
      return NextResponse.json(
        { success: false, error: "Please provide at least a product title or part type." },
        { status: 400 }
      );
    }

    // Sanitize input strings
    const sanitizedInput: ProductAIGenerateInput = {
      name: String(body.name || "").slice(0, 200).trim(),
      brand: body.brand ? String(body.brand).slice(0, 100).trim() : undefined,
      model: body.model ? String(body.model).slice(0, 100).trim() : undefined,
      partType: body.partType ? String(body.partType).slice(0, 100).trim() : undefined,
      qualityGrade: body.qualityGrade ? String(body.qualityGrade).slice(0, 50).trim() : undefined,
      warranty: body.warranty ? String(body.warranty).slice(0, 50).trim() : undefined,
      compatibleModels: body.compatibleModels ? String(body.compatibleModels).slice(0, 300).trim() : undefined,
    };

    const result = await generateAIDescription(sanitizedInput);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("AI Description generation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate description" },
      { status: 500 }
    );
  }
}
