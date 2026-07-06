import { json } from "./_lib/http.js";
import { getSupabaseAdmin, getSupabaseForAuthVerify } from "./_lib/supabase-admin.js";
import { analyzeStoredUpload } from "./_lib/geometry-analysis.js";

async function requireUser(event) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { ok: false, response: json(401, { error: "Missing authorization token" }) };
  }

  const authClient = getSupabaseForAuthVerify();
  if (!authClient) {
    return { ok: false, response: json(500, { error: "Server misconfigured: Supabase env vars are missing" }) };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { ok: false, response: json(401, { error: "Invalid or expired token" }) };
  }

  return { ok: true, user: data.user, token };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(500, { error: "Server misconfigured: Supabase env vars are missing" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const uploadJobId = String(body?.uploadJobId || "").trim();

    if (!uploadJobId) {
      return json(400, { error: "Missing upload job metadata" });
    }

    const { data: uploadJob, error: uploadError } = await supabase
      .from("stl_upload_jobs")
      .select("id, storage_bucket, storage_path, original_name, size_bytes")
      .eq("id", uploadJobId)
      .maybeSingle();

    if (uploadError) return json(500, { error: uploadError.message });
    if (!uploadJob) return json(404, { error: "Upload job not found" });

    const analysis = await analyzeStoredUpload({
      supabase,
      uploadJob,
      authorizationToken: auth.token,
    });

    return json(200, {
      success: true,
      ...analysis,
    });
  } catch (error) {
    return json(500, { error: error?.message || "Geometry analysis failed" });
  }
};