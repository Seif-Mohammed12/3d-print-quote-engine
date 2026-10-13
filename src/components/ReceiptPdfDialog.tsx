import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReceiptPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pdfUrl: string | null;
  fileName: string;
};

export default function ReceiptPdfDialog({
  open,
  onOpenChange,
  title,
  description,
  pdfUrl,
  fileName,
}: ReceiptPdfDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] p-0 overflow-hidden bg-background">
        <div className="flex h-full flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/70">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 bg-secondary/30 p-3 sm:p-4">
            {pdfUrl ? (
              <iframe
                title={title}
                src={pdfUrl}
                className="h-full w-full border border-border bg-background"
              />
            ) : (
              <div className="flex h-full items-center justify-center border border-border bg-background text-sm text-muted-foreground">
                Preparing receipt preview...
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/70 px-6 py-4">
            <a
              href={pdfUrl || undefined}
              download={fileName}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
