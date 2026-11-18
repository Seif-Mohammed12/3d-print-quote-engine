import type { ProductOptionGroup } from "@/lib/brand-catalog";
import { formatEGP } from "@/lib/catalog-format";
import { cn } from "@/lib/utils";

function deltaText(n: number) {
  if (!n) return "";
  return `${n > 0 ? "+" : "−"}${formatEGP(Math.abs(n))}`;
}

type OptionPickerProps = {
  group: ProductOptionGroup;
  value: string;
  onChange: (valueId: string) => void;
  className?: string;
};

/**
 * One option group (size, pattern, finish…) shown the way the admin chose: buttons, swatches
 * or a dropdown. Unavailable values stay visible but can't be picked. Price changes are shown
 * next to each value; the server recalculates them at checkout.
 */
export default function OptionPicker({ group, value, onChange, className }: OptionPickerProps) {
  const selected = group.values.find((v) => v.id === value);
  const legend = (
    <legend className="flex w-full items-baseline justify-between gap-3 text-[15px]">
      <span className="font-semibold">
        {group.name}
        {!group.isRequired ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </span>
      <span className="text-muted-foreground">{selected?.label || (group.isRequired ? "Pick one" : "None")}</span>
    </legend>
  );

  if (group.displayType === "dropdown") {
    const id = `opt-${group.id}`;
    return (
      <div className={cn("min-w-0", className)}>
        <label htmlFor={id} className="flex w-full items-baseline justify-between gap-3 text-[15px]">
          <span className="font-semibold">
            {group.name}
            {!group.isRequired ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
          </span>
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 h-12 w-full border border-rule bg-background px-3 text-[15px] text-foreground focus-visible:border-foreground"
        >
          <option value="" disabled={group.isRequired}>
            {group.isRequired ? "Pick one" : "None"}
          </option>
          {group.values.map((v) => (
            <option key={v.id} value={v.id} disabled={!v.isAvailable}>
              {v.label}
              {v.priceDelta ? ` (${deltaText(v.priceDelta)})` : ""}
              {!v.isAvailable ? " · unavailable" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const swatches = group.displayType === "swatches";
  return (
    <fieldset className={cn("min-w-0", className)}>
      {legend}
      <div className={cn("mt-3 grid gap-2", swatches ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
        {!group.isRequired ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-pressed={!value}
            className={cn(
              "flex min-h-12 items-center gap-3 border px-3 text-left text-sm transition-colors",
              !value ? "border-foreground bg-secondary text-foreground" : "border-rule text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            )}
          >
            None
          </button>
        ) : null}
        {group.values.map((v) => {
          const active = v.id === value;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => v.isAvailable && onChange(v.id)}
              aria-pressed={active}
              aria-disabled={!v.isAvailable}
              disabled={!v.isAvailable}
              className={cn(
                "flex min-h-12 items-center gap-3 border px-3 text-left text-sm transition-colors",
                active ? "border-foreground bg-secondary text-foreground" : "border-rule text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                !v.isAvailable && "cursor-not-allowed opacity-50 hover:border-rule hover:text-muted-foreground"
              )}
            >
              {swatches ? (
                <span className="h-6 w-6 shrink-0 border border-white/15" style={{ backgroundColor: v.swatchHex || "transparent" }} aria-hidden="true" />
              ) : null}
              <span className="min-w-0 py-2 leading-tight">
                {v.label}
                {v.priceDelta ? <span className="num block text-xs text-muted-foreground">{deltaText(v.priceDelta)}</span> : null}
                {!v.isAvailable ? <span className="block text-xs">Unavailable</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
