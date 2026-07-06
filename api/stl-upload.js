import Busboy from "busboy";
import { Readable } from "node:stream";
import { json } from "./_lib/http.js";
import { getSupabaseAdmin, getSupabaseForAuthVerify } from "./_lib/supabase-admin.js";
import { buildStoragePath, createUploadJobId, sha256, validateStlBuffer, STL_UPLOAD_BUCKET } from "./_lib/stl-validation.js";
import { analyzeStoredUpload } from "./_lib/geometry-analysis.js";

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") continue;
    normalized[String(key).toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return normalized;
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const headers = normalizeHeaders(event?.headers);
    const contentType = headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      reject(new Error("Content-Type must be multipart/form-data"));
      return;
    }

    const busboy = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: 50 * 1024 * 1024 } });
    const fields = {};
    const files = [];

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (_name, file, info) => {
      const chunks = [];
      let size = 0;

      file.on("data", (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      file.on("limit", () => {
        reject(new Error("STL files must be smaller than 50 MB."));
      });

      file.on("end", () => {
        files.push({
          filename: info.filename || "model.stl",
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
          size,
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve({ fields, files }));

    const body = event?.isBase64Encoded ? Buffer.from(event?.body || "", "base64") : Buffer.from(event?.body || "");
    Readable.from(body).pipe(busboy);
  });
}

async function resolveUploadUserId(event) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) return null;

  const authClient = getSupabaseForAuthVerify();
  if (!authClient) {
    throw new Error("Server misconfigured: Supabase env vars are missing");
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Error("Invalid or expired token");
  }

  return data.user.id;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(500, { error: "Server misconfigured: Supabase env vars are missing" });
  }

  try {
    const userId = await resolveUploadUserId(event).catch((error) => {
      throw new Error(error?.message || "Invalid or expired token");
    });

    const { fields, files } = await parseMultipart(event);
    if (files.length === 0) return json(400, { error: "Missing STL file" });
    if (files.length > 1) return json(400, { error: "Only one STL file can be uploaded at a time" });

    const file = files[0];
    const jobId = fields.jobId ? String(fields.jobId).trim() : createUploadJobId();
    const fileName = String(file.filename || "model.stl");

    const validation = validateStlBuffer(file.buffer, fileName);
    if (!validation.ok) {
      return json(400, { error: validation.error });
    }

    const storagePath = buildStoragePath(jobId, fileName);
    const checksum = sha256(file.buffer);

    const { error: uploadError } = await supabase.storage.from(STL_UPLOAD_BUCKET).upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });

    if (uploadError) {
      return json(500, { error: uploadError.message });
    }

    const { error: insertError } = await supabase.from("stl_upload_jobs").insert({
      id: jobId,
      user_id: userId,
      original_name: fileName,
      sanitized_name: storagePath.split("/").slice(-1)[0],
      mime_type: file.mimeType,
      size_bytes: file.size,
      checksum,
      storage_bucket: STL_UPLOAD_BUCKET,
      storage_path: storagePath,
      status: "stored",
      validation: { status: "uploaded" },
    });

    if (insertError) {
      await supabase.storage.from(STL_UPLOAD_BUCKET).remove([storagePath]);
      return json(500, { error: insertError.message });
    }

    let analysis;
    try {
      analysis = await analyzeStoredUpload({
        supabase,
        uploadJob: {
          id: jobId,
          storage_bucket: STL_UPLOAD_BUCKET,
          storage_path: storagePath,
          original_name: fileName,
          size_bytes: file.size,
        },
        authorizationToken: null,
      });
    } catch (analysisError) {
      await supabase.storage.from(STL_UPLOAD_BUCKET).remove([storagePath]);
      await supabase.from("stl_upload_jobs").update({ status: "failed", validation: { error: analysisError?.message || "Geometry analysis failed" } }).eq("id", jobId);
      return json(502, { error: analysisError?.message || "Geometry analysis failed" });
    }

    await supabase.from("stl_upload_jobs").update({ validation: analysis }).eq("id", jobId);

    return json(200, {
      success: true,
      jobId,
      storagePath,
      checksum,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      stlResult: validation.stlResult,
      analysis,
    });
  } catch (error) {
    return json(400, { error: error?.message || "Failed to upload STL" });
  }
};