import Busboy from "busboy";
import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { isUuid } from "./_lib/order-pricing.js";
import { detectImageType, MAX_IMAGE_BYTES } from "./_lib/image-validation.js";

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const headers = event.headers || {};
    const contentType = headers["content-type"] || headers["Content-Type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      reject(new Error("Content-Type must be multipart/form-data"));
      return;
    }

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10 },
    });
    const fields = {};
    let fileBuffer = null;
    let fileName = "upload.bin";
    let mimeType = "application/octet-stream";
    let truncated = false;

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (_name, file, info) => {
      fileName = info.filename || fileName;
      mimeType = info.mimeType || mimeType;
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("limit", () => {
        truncated = true;
      });
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve({ fields, fileBuffer, fileName, mimeType, truncated }));

    const isBase64 = event.isBase64Encoded;
    const body = isBase64 ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "");
    busboy.end(body);
  });
}

function normalizeBaseName(name) {
  const base = String(name || "photo").replace(/\.[^.]*$/, "");
  return base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "photo";
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { fields, fileBuffer, fileName, truncated } = await parseMultipart(event);
    const productId = String(fields.productId || "").trim();
    // productId becomes a folder in the public bucket, so it must be a real id, not a path.
    if (!isUuid(productId)) return json(400, { error: "productId is required" });
    if (!fileBuffer || !fileBuffer.length) return json(400, { error: "Image file is required" });
    if (truncated) return json(413, { error: "Photos must be smaller than 8 MB." });

    // The bucket is public: only store real images, and label them by what the bytes are,
    // not by the file name or content type the browser claimed.
    const imageType = detectImageType(fileBuffer);
    if (!imageType) return json(400, { error: "Only JPEG, PNG, WebP, AVIF or GIF photos can be uploaded." });

    const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
    const path = `${productId}/${Date.now()}-${normalizeBaseName(fileName)}.${imageType.ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType: imageType.mime,
      upsert: false,
    });
    if (uploadError) return json(500, { error: uploadError.message });

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    const imageUrl = publicData?.publicUrl || "";

    const { data: lastImage } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = Number(lastImage?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        image_path: path,
        image_url: imageUrl,
        sort_order: nextSortOrder,
      })
      .select("*")
      .single();
    if (error) return json(500, { error: error.message });

    return json(200, { image: data });
  } catch (err) {
    return json(500, { error: err?.message || "Failed to upload image" });
  }
};

