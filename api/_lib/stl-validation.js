import crypto from "node:crypto";

export const STL_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const STL_UPLOAD_BUCKET = process.env.SUPABASE_STL_UPLOADS_BUCKET || "stl-uploads";

export function normalizeFileName(name) {
  return String(name || "model.stl")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getFileExtension(name) {
  const index = String(name || "").lastIndexOf(".");
  return index >= 0 ? String(name).slice(index).toLowerCase() : "";
}

export function hasAllowedStlExtension(name) {
  return getFileExtension(name) === ".stl";
}

export function buildStoragePath(jobId, fileName) {
  return `${jobId}/${normalizeFileName(fileName)}`;
}

export function createUploadJobId() {
  return crypto.randomUUID();
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function validateStlBuffer(buffer, fileName) {
  if (!buffer || !buffer.length) {
    return { ok: false, error: "The uploaded STL file is empty." };
  }

  if (!hasAllowedStlExtension(fileName)) {
    return { ok: false, error: "Only .stl files are allowed." };
  }

  if (buffer.length > STL_UPLOAD_MAX_BYTES) {
    return { ok: false, error: `STL files must be smaller than ${formatFileSize(STL_UPLOAD_MAX_BYTES)}.` };
  }

  if (buffer.length < 84) {
    return { ok: false, error: "Corrupted or invalid STL file." };
  }

  const text = buffer.toString("utf8");
  const looksAscii = /\bsolid\b/i.test(text) && /\bfacet\s+normal\b/i.test(text) && /\bvertex\b/i.test(text);

  if (!looksAscii) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const triangleCount = view.getUint32(80, true);
    const expectedSize = 84 + triangleCount * 50;

    if (triangleCount <= 0 || buffer.length !== expectedSize) {
      return { ok: false, error: "Corrupted or invalid STL file." };
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let volume = 0;

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
      const offset = 84 + triangleIndex * 50;
      const v1x = view.getFloat32(offset + 12, true);
      const v1y = view.getFloat32(offset + 16, true);
      const v1z = view.getFloat32(offset + 20, true);
      const v2x = view.getFloat32(offset + 24, true);
      const v2y = view.getFloat32(offset + 28, true);
      const v2z = view.getFloat32(offset + 32, true);
      const v3x = view.getFloat32(offset + 36, true);
      const v3y = view.getFloat32(offset + 40, true);
      const v3z = view.getFloat32(offset + 44, true);

      if (![v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z].every(Number.isFinite)) {
        return { ok: false, error: "Corrupted STL geometry detected." };
      }

      volume += signedVolumeOfTriangle(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
      minX = Math.min(minX, v1x, v2x, v3x);
      minY = Math.min(minY, v1y, v2y, v3y);
      minZ = Math.min(minZ, v1z, v2z, v3z);
      maxX = Math.max(maxX, v1x, v2x, v3x);
      maxY = Math.max(maxY, v1y, v2y, v3y);
      maxZ = Math.max(maxZ, v1z, v2z, v3z);
    }

    if (![volume, minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
      return { ok: false, error: "Corrupted STL geometry detected." };
    }

    return {
      ok: true,
      stlResult: {
        volume: Math.abs(volume) / 1000,
        triangleCount,
        boundingBox: {
          x: maxX - minX,
          y: maxY - minY,
          z: maxZ - minZ,
        },
      },
    };
  }

  const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const vertices = [];
  let match;

  while ((match = vertexRegex.exec(text))) {
    const x = Number.parseFloat(match[1]);
    const y = Number.parseFloat(match[2]);
    const z = Number.parseFloat(match[3]);
    if (![x, y, z].every(Number.isFinite)) {
      return { ok: false, error: "Corrupted STL geometry detected." };
    }
    vertices.push([x, y, z]);
  }

  if (vertices.length < 3 || vertices.length % 3 !== 0) {
    return { ok: false, error: "Corrupted or invalid STL file." };
  }

  let volume = 0;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let index = 0; index < vertices.length; index += 3) {
    const [v1x, v1y, v1z] = vertices[index];
    const [v2x, v2y, v2z] = vertices[index + 1];
    const [v3x, v3y, v3z] = vertices[index + 2];

    volume += signedVolumeOfTriangle(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
    minX = Math.min(minX, v1x, v2x, v3x);
    minY = Math.min(minY, v1y, v2y, v3y);
    minZ = Math.min(minZ, v1z, v2z, v3z);
    maxX = Math.max(maxX, v1x, v2x, v3x);
    maxY = Math.max(maxY, v1y, v2y, v3y);
    maxZ = Math.max(maxZ, v1z, v2z, v3z);
  }

  if (![volume, minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return { ok: false, error: "Corrupted STL geometry detected." };
  }

  return {
    ok: true,
    stlResult: {
      volume: Math.abs(volume) / 1000,
      triangleCount: vertices.length / 3,
      boundingBox: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      },
    },
  };
}

function signedVolumeOfTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
  return (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1)) / 6.0;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}