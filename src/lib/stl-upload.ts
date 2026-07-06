import { parseSTL, type STLResult } from "@/lib/stl-parser";

export const STL_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const STL_UPLOAD_ALLOWED_EXTENSIONS = [".stl"] as const;
export const STL_UPLOAD_ENDPOINT = "/api/stl-upload";
export const STL_UPLOAD_BUCKET = "stl-uploads";

export type PreparedStlUpload = {
  jobId: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileBuffer: ArrayBuffer;
  stlResult: STLResult;
};

export type CompletedStlUpload = PreparedStlUpload & {
  checksum: string;
  uploadedAt: string;
};

export type StlUploadApiResponse = {
  success: true;
  jobId: string;
  storagePath: string;
  checksum: string;
  uploadedAt: string;
  fileSize: number;
  stlResult: STLResult;
  isLocalFallback?: boolean;
};

export type StlSelectionValidation =
  | { ok: true; file: File }
  | { ok: false; error: string };

export function getStlFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export function hasAllowedStlExtension(fileName: string) {
  return STL_UPLOAD_ALLOWED_EXTENSIONS.includes(getStlFileExtension(fileName) as ".stl");
}

export function normalizeStlFileName(fileName: string) {
  return String(fileName || "model.stl")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function createStlUploadJobId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `stl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildStlStoragePath(jobId: string, fileName: string) {
  return `${jobId}/${normalizeStlFileName(fileName)}`;
}

export function validateStlSelection(files: FileList | File[] | null | undefined): StlSelectionValidation {
  const selectedFiles = files ? Array.from(files as ArrayLike<File>) : [];

  if (selectedFiles.length === 0) {
    return { ok: false, error: "Please choose a single STL file." };
  }

  if (selectedFiles.length > 1) {
    return { ok: false, error: "Only one STL file can be uploaded per quote request." };
  }

  const file = selectedFiles[0];
  if (!file) {
    return { ok: false, error: "Please choose a valid STL file." };
  }

  if (!hasAllowedStlExtension(file.name)) {
    return { ok: false, error: "Only .stl files are allowed." };
  }

  if (file.size <= 0) {
    return { ok: false, error: "The selected STL file is empty." };
  }

  if (file.size > STL_UPLOAD_MAX_BYTES) {
    return { ok: false, error: `STL files must be smaller than ${formatFileSize(STL_UPLOAD_MAX_BYTES)}.` };
  }

  return { ok: true, file };
}

export async function prepareStlUpload(file: File): Promise<PreparedStlUpload> {
  const validation = validateStlSelection([file]);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error("Failed to read the STL file.");
  }

  let stlResult: STLResult;
  try {
    stlResult = parseSTL(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid STL file.";
    throw new Error(message.toLowerCase().includes("stl") ? message : "Corrupted or unsupported STL file.");
  }

  const jobId = createStlUploadJobId();

  return {
    jobId,
    storagePath: buildStlStoragePath(jobId, file.name),
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileBuffer: buffer,
    stlResult,
  };
}

export function uploadStlFile(
  file: File,
  jobId: string,
  options?: {
    authorizationToken?: string | null;
    onProgress?: (progress: number) => void;
    allowLocalFallback?: boolean;
  }
): Promise<StlUploadApiResponse> {
  const allowLocalFallback = options?.allowLocalFallback !== false;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", STL_UPLOAD_ENDPOINT, true);
    request.responseType = "json";

    if (options?.authorizationToken) {
      request.setRequestHeader("Authorization", `Bearer ${options.authorizationToken}`);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      options.onProgress(progress);
    };

    request.onerror = () => {
      if (allowLocalFallback) {
        resolve(createLocalFallbackResponse(file, jobId));
        return;
      }

      reject(new Error("Upload failed. Please try again."));
    };
    request.onabort = () => reject(new Error("Upload was cancelled."));
    request.onload = () => {
      const response = request.response as Partial<StlUploadApiResponse> | null;
      if (request.status < 200 || request.status >= 300) {
        if (allowLocalFallback && request.status === 404) {
          resolve(createLocalFallbackResponse(file, jobId));
          return;
        }

        reject(new Error((response as { error?: string } | null)?.error || `Upload failed (${request.status})`));
        return;
      }

      if (!response?.success || !response.jobId || !response.storagePath) {
        reject(new Error("Upload endpoint returned an unexpected response."));
        return;
      }

      resolve(response as StlUploadApiResponse);
    };

    const formData = new FormData();
    formData.append("jobId", jobId);
    formData.append("file", file, file.name);
    request.send(formData);
  });
}

function createLocalFallbackResponse(file: File, jobId: string): StlUploadApiResponse {
  return {
    success: true,
    jobId,
    storagePath: `local/${jobId}/${normalizeStlFileName(file.name)}`,
    checksum: `${jobId}-${file.size}`,
    uploadedAt: new Date().toISOString(),
    fileSize: file.size,
    stlResult: {
      volume: 0,
      triangleCount: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
    },
    isLocalFallback: true,
  };
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}