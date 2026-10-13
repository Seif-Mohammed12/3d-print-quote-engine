import type { ProductColor } from "@/lib/brand-catalog";
import { cn } from "@/lib/utils";

type ColorPickerProps = {
  legend: string;
  colors: ProductColor[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** One row of square chips; the chosen name stays visible in the legend. */
  compact?: boolean;
};

/** Colour choice as named swatches. The name is always visible; nothing hides behind a tooltip. */
export default function ColorPicker({ legend, colors, value, onChange, className, compact = false }: ColorPickerProps) {
  const selected = colors.find((c) => c.id === value);
  if (compact) {
    return (
      <fieldset className={cn("min-w-0", className)}>
        <legend className="flex w-full items-baseline justify-between gap-3 text-[15px]">
          <span className="font-semibold">{legend}</span>
          <span className="text-muted-foreground">{selected?.name || "Pick one"}</span>
        </legend>
        <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 py-1 md:flex-wrap md:overflow-visible">
          {colors.map((color) => {
            const active = color.id === value;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onChange(color.id)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-11 flex-none snap-start items-center gap-2 border px-2.5 text-sm transition-colors",
                  active ? "border-foreground bg-secondary text-foreground" : "border-rule text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                )}
              >
                <span className="h-5 w-5 shrink-0 border border-white/15" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                <span className="whitespace-nowrap">{color.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="flex w-full items-baseline justify-between gap-3 text-[15px]">
        <span className="font-semibold">{legend}</span>
        <span className="text-muted-foreground">{selected?.name || "Pick one"}</span>
      </legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {colors.map((color) => {
          const active = color.id === value;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              aria-pressed={active}
              className={cn(
                "flex min-h-12 items-center gap-3 border px-3 text-left text-sm transition-colors",
                active ? "border-foreground bg-secondary text-foreground" : "border-rule text-muted-foreground hover:border-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className="h-6 w-6 shrink-0 border border-white/15"
                style={{ backgroundColor: color.hex }}
                aria-hidden="true"
              />
              <span className="min-w-0 py-2 leading-tight">{color.name}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
