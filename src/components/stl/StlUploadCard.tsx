import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileType, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ModelViewer from "@/components/ModelViewer";
import { getAccessToken } from "@/lib/auth-session";
import {
  formatFileSize,
  prepareStlUpload,
  type CompletedStlUpload,
  type PreparedStlUpload,
  type StlSelectionValidation,
  uploadStlFile,
  validateStlSelection,
} from "@/lib/stl-upload";

type UploadStatus = "idle" | "validating" | "uploading" | "ready" | "error";

export type StlUploadCardProps = {
  onReady: (asset: CompletedStlUpload) => void;
  onReset?: () => void;
};

export default function StlUploadCard({ onReady, onReset }: StlUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<(PreparedStlUpload & { checksum?: string; uploadedAt?: string }) | null>(null);

  const reset = useCallback(() => {
    setDragOver(false);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setDraft(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onReset?.();
  }, [onReset]);

  const startUpload = useCallback(async (selectedFile: File) => {
    setError(null);
    setStatus("validating");
    setProgress(0);

    try {
      const prepared = await prepareStlUpload(selectedFile);
      const token = await getAccessToken();

      setDraft(prepared);
      setStatus("uploading");
      setProgress(5);

      const response = await uploadStlFile(selectedFile, prepared.jobId, {
        authorizationToken: token,
        allowLocalFallback: true,
        onProgress: (nextProgress) => setProgress(Math.max(5, nextProgress)),
      });

      const completed: CompletedStlUpload = {
        ...prepared,
        jobId: response.jobId,
        storagePath: response.storagePath,
        checksum: response.checksum,
        uploadedAt: response.uploadedAt,
      };

      setDraft(completed);
      setProgress(100);
      setStatus("ready");
      onReady(completed);
      if (response.isLocalFallback) {
        toast.warning("Upload endpoint is unavailable in this environment. Using local quote mode.");
      } else {
        toast.success("STL uploaded securely.");
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setError(message);
      setStatus("error");
      setProgress(0);
      toast.error(message);
    }
  }, [onReady]);

  const handleSelection = useCallback(async (files: FileList | File[] | null | undefined) => {
    const validation: StlSelectionValidation = validateStlSelection(files);
    if (!validation.ok) {
      setError(validation.error);
      setStatus("error");
      setProgress(0);
      toast.error(validation.error);
      return;
    }

    await startUpload(validation.file);
  }, [startUpload]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isBusy = status === "validating" || status === "uploading";

  return (
    <div className="space-y-4">
      {!draft ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleSelection(event.dataTransfer.files);
          }}
          onClick={openFilePicker}
          className={`panel border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="mx-auto mb-4 h-12 w-12 text-primary/50" />
          <h3 className="mb-2 font-heading font-semibold text-foreground">Drop your STL file here</h3>
          <p className="text-sm text-muted-foreground">Supports one .stl file per quote request.</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".stl,model/stl,application/sla,application/vnd.ms-pki.stl,application/octet-stream"
            multiple
            onChange={(event) => {
              void handleSelection(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </motion.div>
      ) : (
        <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileType className="h-4 w-4 text-primary" />
                <span className="truncate">{draft.fileName}</span>
              </CardTitle>
              <button
                type="button"
                onClick={reset}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Reset upload"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 border border-border px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Secure storage
              </span>
              <span className="border border-border px-2.5 py-1">Job {draft.jobId.slice(0, 8)}</span>
              <span className="border border-border px-2.5 py-1">{formatFileSize(draft.fileSize)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelViewer fileBuffer={draft.fileBuffer} />

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Volume", value: `${draft.stlResult.volume.toFixed(2)} cm³` },
                { label: "Triangles", value: draft.stlResult.triangleCount.toLocaleString() },
                {
                  label: "Size",
                  value: `${draft.stlResult.boundingBox.x.toFixed(0)}×${draft.stlResult.boundingBox.y.toFixed(0)}×${draft.stlResult.boundingBox.z.toFixed(0)}mm`,
                },
              ].map((stat) => (
                <div key={stat.label} className="panel p-3 text-center">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isBusy ? "Uploading to secure storage..." : status === "ready" ? "Upload complete" : "Ready"}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}