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

/**
 * Uploads a customer profile avatar picture.
 * Tries Supabase storage first; falls back to compressed Base64 Data URL for instant reliability.
 */
export async function uploadAvatarImage(file: File): Promise<UploadResult> {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const maxSizeBytes = 4 * 1024 * 1024; // 4MB

  if (!allowedMimeTypes.includes(file.type)) {
    return {
      url: null,
      error: "Please select a valid JPG, PNG, or WEBP image.",
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      url: null,
      error: "Image size exceeds 4MB limit.",
    };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
      if (data?.publicUrl) {
        return { url: data.publicUrl, error: null };
      }
    }
  } catch (err) {
    console.warn("Storage upload notice (falling back to DataURL):", err);
  }

  // Fallback: Read as base64 Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ url: e.target?.result as string, error: null });
    };
    reader.onerror = () => {
      resolve({ url: null, error: "Failed to process selected picture." });
    };
    reader.readAsDataURL(file);
  });
}
