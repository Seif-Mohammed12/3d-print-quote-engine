import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import PhotoPending from "./PhotoPending";

type SleeveProps = {
  src?: string;
  alt: string;
  catalogueNo: string;
  /** Plastic colour shown on the spine. Changing it wipes the spine to the new colour. */
  spineHex: string;
  spineLabel?: string;
  shot?: string;
  className?: string;
  loading?: "eager" | "lazy";
  children?: ReactNode;
};

function readableOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "hsl(var(--foreground))";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#0E0E0F" : "#EDEAE4";
}

/**
 * A square record sleeve: the product photo with a coloured spine on its left edge
 * carrying the catalogue number. The spine is the one moving part of the system.
 */
export default function Sleeve({
  src,
  alt,
  catalogueNo,
  spineHex,
  spineLabel,
  shot,
  className,
  loading = "lazy",
  children,
}: SleeveProps) {
  const [under, setUnder] = useState(spineHex);
  const current = useRef(spineHex);

  useEffect(() => {
    if (current.current === spineHex) return;
    const previous = current.current;
    current.current = spineHex;
    setUnder(previous);
  }, [spineHex]);

  return (
    <div className={cn("relative flex aspect-square w-full overflow-hidden bg-black", className)}>
      <div className="relative w-7 shrink-0 border-r border-white/10 md:w-9" style={{ background: under }} aria-hidden="true">
        <div
          key={spineHex}
          className="spine-wipe absolute inset-0 flex items-end justify-center pb-3"
          style={{ background: spineHex, color: readableOn(spineHex) }}
        >
          <span className="whitespace-nowrap text-[11px] font-semibold tracking-[0.08em] [writing-mode:vertical-rl] rotate-180 md:text-xs">
            {catalogueNo}
            {spineLabel ? ` · ${spineLabel}` : ""}
          </span>
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        {src ? (
          <img src={src} alt={alt} loading={loading} decoding="async" className="h-full w-full object-cover" />
        ) : (
          <PhotoPending shot={shot} />
        )}
        {children}
      </div>
    </div>
  );
}
