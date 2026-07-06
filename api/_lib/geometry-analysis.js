import crypto from "node:crypto";

const GEOMETRY_SERVICE_URL = process.env.GEOMETRY_SERVICE_URL || "http://127.0.0.1:8001";

export async function analyzeStoredUpload({ supabase, uploadJob, authorizationToken }) {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(uploadJob.storage_bucket)
    .download(uploadJob.storage_path);

  if (downloadError) {
    throw new Error(downloadError.message);
  }

  if (!fileData) {
    throw new Error("Uploaded STL file could not be loaded from storage");
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const formData = new FormData();
  formData.append("file", new Blob([arrayBuffer], { type: "application/sla" }), uploadJob.original_name);

  const analysisResponse = await fetch(`${GEOMETRY_SERVICE_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  const analysisPayload = await analysisResponse.json().catch(() => ({}));
  if (!analysisResponse.ok) {
    throw new Error(analysisPayload?.detail || analysisPayload?.error || "Geometry analysis failed");
  }

  const analysisId = crypto.randomUUID();
  const analysisRow = {
    id: analysisId,
    stl_upload_job_id: uploadJob.id,
    file_name: analysisPayload.file_name || uploadJob.original_name,
    file_size: analysisPayload.file_size || uploadJob.size_bytes,
    bounding_box: analysisPayload.geometry.boundingBox,
    width: analysisPayload.geometry.width,
    height: analysisPayload.geometry.height,
    depth: analysisPayload.geometry.depth,
    mesh_volume: analysisPayload.mesh.volume,
    surface_area: analysisPayload.mesh.surfaceArea,
    triangle_count: analysisPayload.mesh.triangleCount,
    face_count: analysisPayload.mesh.faceCount,
    watertight: analysisPayload.quality.watertight,
    non_manifold: analysisPayload.quality.nonManifold,
    estimated_complexity: analysisPayload.quality.estimatedComplexity,
    aspect_ratio: analysisPayload.geometry.aspectRatio,
    center_of_mass: analysisPayload.geometry.centerOfMass,
    analysis: analysisPayload,
    analyzed_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from("geometry_analysis_jobs").insert(analysisRow);
  if (insertError) {
    throw new Error(insertError.message);
  }

  await supabase
    .from("stl_upload_jobs")
    .update({ validation: analysisPayload, status: "stored" })
    .eq("id", uploadJob.id);

  return {
    analysisId,
    uploadJobId: uploadJob.id,
    fileName: analysisRow.file_name,
    fileSize: analysisRow.file_size,
    geometry: {
      boundingBox: analysisPayload.geometry.boundingBox,
      width: analysisPayload.geometry.width,
      height: analysisPayload.geometry.height,
      depth: analysisPayload.geometry.depth,
      aspectRatio: analysisPayload.geometry.aspectRatio,
      centerOfMass: analysisPayload.geometry.centerOfMass,
    },
    mesh: {
      volume: analysisPayload.mesh.volume,
      surfaceArea: analysisPayload.mesh.surfaceArea,
      triangleCount: analysisPayload.mesh.triangleCount,
      faceCount: analysisPayload.mesh.faceCount,
    },
    quality: {
      watertight: analysisPayload.quality.watertight,
      nonManifold: analysisPayload.quality.nonManifold,
      estimatedComplexity: analysisPayload.quality.estimatedComplexity,
    },
  };
}