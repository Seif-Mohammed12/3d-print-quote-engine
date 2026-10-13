import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type PhotoPendingProps = {
  /** What the photo should show, from the shot list. */
  shot?: string;
  className?: string;
  compact?: boolean;
};

/**
 * PHOTO PLACEHOLDER — replace with a real photo of the print.
 * Honest blank plate for products and sections still waiting on photography.
 */
export default function PhotoPending({ shot, className, compact = false }: PhotoPendingProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between border border-dashed border-rule bg-card p-3 text-muted-foreground",
        className,
      )}
      role="img"
      aria-label={shot ? `Photo coming soon: ${shot}` : "Photo coming soon"}
    >
      <Camera className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.5} aria-hidden="true" />
      {!compact ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Photo on the way</p>
          {shot ? <p className="text-xs leading-snug">{shot}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
