import { supabase } from "@/lib/supabase";

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Uploads a product image to Supabase Storage in the 'product-images' bucket.
 * Validates format (JPG, JPEG, PNG, WEBP) and size (<= 5MB).
 * Returns the public CDN URL or an error message.
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.type)) {
    return {
      url: null,
      error: "Invalid file format. Only JPG, PNG, and WEBP images are supported.",
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      url: null,
      error: "File size exceeds 5MB limit. Please choose a smaller image.",
    };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const sanitizedBase = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 30);

  const fileName = `${Date.now()}-${sanitizedBase}.${fileExt}`;
  const filePath = `products/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error:", uploadError);
      return {
        url: null,
        error: uploadError.message || "Failed to upload image to Supabase Storage.",
      };
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      error: null,
    };
  } catch (err: unknown) {
    console.error("Storage upload exception:", err);
    return {
      url: null,
      error: "Unexpected error during image upload.",
    };
  }
}
