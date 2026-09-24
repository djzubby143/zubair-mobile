import { NextRequest, NextResponse } from "next/server";
import { generateAIProductImage, ProductAIGenerateInput } from "@/lib/aiProductGenerator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: ProductAIGenerateInput = await req.json();

    const result = await generateAIProductImage(body);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("AI Image generation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate product image" },
      { status: 500 }
    );
  }
}
