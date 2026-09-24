import { NextRequest, NextResponse } from "next/server";
import { generateAIDescription, ProductAIGenerateInput } from "@/lib/aiProductGenerator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: ProductAIGenerateInput = await req.json();

    if (!body.name && !body.partType) {
      return NextResponse.json(
        { success: false, error: "Please provide at least a product title or part type." },
        { status: 400 }
      );
    }

    const result = await generateAIDescription(body);

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
