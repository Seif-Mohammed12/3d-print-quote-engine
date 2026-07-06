// Lightweight STL parser that calculates volume from triangles
export interface STLResult {
  volume: number; // cm³
  triangleCount: number;
  boundingBox: { x: number; y: number; z: number };
}

export function parseSTL(buffer: ArrayBuffer): STLResult {
  if (buffer.byteLength < 84) {
    throw new Error("File too small to be a valid STL");
  }

  const asciiCandidate = new TextDecoder().decode(buffer);
  if (looksLikeAsciiSTL(asciiCandidate)) {
    return parseASCIISTL(buffer);
  }

  const view = new DataView(buffer);
  return parseBinarySTL(view, buffer);
}

function parseBinarySTL(view: DataView, buffer: ArrayBuffer): STLResult {
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;

  if (triangleCount <= 0) {
    throw new Error("Invalid STL: no triangles found");
  }

  if (buffer.byteLength !== expectedSize) {
    throw new Error("Corrupted binary STL: triangle count does not match file size");
  }

  let volume = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    // Skip normal (12 bytes), read 3 vertices
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
      throw new Error("Corrupted binary STL: invalid vertex coordinates");
    }

    // Signed volume of tetrahedron
    volume += signedVolumeOfTriangle(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);

    // Bounding box
    minX = Math.min(minX, v1x, v2x, v3x);
    minY = Math.min(minY, v1y, v2y, v3y);
    minZ = Math.min(minZ, v1z, v2z, v3z);
    maxX = Math.max(maxX, v1x, v2x, v3x);
    maxY = Math.max(maxY, v1y, v2y, v3y);
    maxZ = Math.max(maxZ, v1z, v2z, v3z);
  }

  // Volume in mm³ → cm³
  const volumeCm3 = Math.abs(volume) / 1000;

  return {
    volume: volumeCm3,
    triangleCount,
    boundingBox: {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    },
  };
}

function parseASCIISTL(buffer: ArrayBuffer): STLResult {
  const text = new TextDecoder().decode(buffer);
  if (!looksLikeAsciiSTL(text)) {
    throw new Error("Corrupted or invalid ASCII STL file");
  }

  const vertexRegex = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
  const vertices: number[][] = [];
  let match;

  while ((match = vertexRegex.exec(text))) {
    const x = Number.parseFloat(match[1]);
    const y = Number.parseFloat(match[2]);
    const z = Number.parseFloat(match[3]);
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error("Corrupted ASCII STL: invalid vertex coordinates");
    }
    vertices.push([x, y, z]);
  }

  if (vertices.length < 3 || vertices.length % 3 !== 0) {
    throw new Error("Corrupted or incomplete ASCII STL file");
  }

  let volume = 0;
  let triangleCount = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i += 3) {
    if (i + 2 >= vertices.length) break;
    const [v1x, v1y, v1z] = vertices[i];
    const [v2x, v2y, v2z] = vertices[i + 1];
    const [v3x, v3y, v3z] = vertices[i + 2];

    volume += signedVolumeOfTriangle(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
    triangleCount++;

    minX = Math.min(minX, v1x, v2x, v3x);
    minY = Math.min(minY, v1y, v2y, v3y);
    minZ = Math.min(minZ, v1z, v2z, v3z);
    maxX = Math.max(maxX, v1x, v2x, v3x);
    maxY = Math.max(maxY, v1y, v2y, v3y);
    maxZ = Math.max(maxZ, v1z, v2z, v3z);
  }

  const volumeCm3 = Math.abs(volume) / 1000;
  return {
    volume: volumeCm3,
    triangleCount,
    boundingBox: {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    },
  };
}

function signedVolumeOfTriangle(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number
): number {
  return (
    (x1 * (y2 * z3 - y3 * z2) +
     x2 * (y3 * z1 - y1 * z3) +
     x3 * (y1 * z2 - y2 * z1)) / 6.0
  );
}

function looksLikeAsciiSTL(text: string): boolean {
  return /\bsolid\b/i.test(text) && /\bfacet\s+normal\b/i.test(text) && /\bvertex\b/i.test(text);
}
