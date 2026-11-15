// Product photos go into a public bucket, so the type is decided from the file's own bytes.

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function startsWith(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function ascii(buffer, start, end) {
  return buffer.subarray(start, end).toString("latin1");
}

/** Returns { mime, ext } for a supported raster image, or null (SVG and HTML are refused). */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (ascii(buffer, 0, 6) === "GIF87a" || ascii(buffer, 0, 6) === "GIF89a") return { mime: "image/gif", ext: "gif" };
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(buffer, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(buffer, 8, 12))) {
    return { mime: "image/avif", ext: "avif" };
  }
  return null;
}
