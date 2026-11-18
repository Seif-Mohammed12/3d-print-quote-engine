import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InlineCellProps = {
  value: string | number | null;
  /** How the value reads when not editing. */
  display?: string;
  placeholder?: string;
  type?: "text" | "money" | "int";
  label: string;
  disabled?: boolean;
  saving?: boolean;
  align?: "left" | "right";
  /** Return false to keep the editor open. `null` means the field was cleared. */
  onCommit: (value: string | number | null) => Promise<boolean> | boolean;
  allowEmpty?: boolean;
  className?: string;
};

/**
 * Click (or Enter) to edit, Enter or leaving the field to save, Escape to cancel.
 * The visible value is a button, so the cell is reachable and operable by keyboard.
 */
export default function InlineCell({
  value,
  display,
  placeholder = "—",
  type = "text",
  label,
  disabled,
  saving,
  align = "left",
  onCommit,
  allowEmpty,
  className,
}: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committing = useRef(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const start = () => {
    if (disabled) return;
    setDraft(value == null ? "" : String(value));
    setError("");
    setEditing(true);
  };

  const commit = async () => {
    if (committing.current) return;
    const raw = draft.trim();
    if (raw === (value == null ? "" : String(value))) {
      setEditing(false);
      return;
    }
    let parsed: string | number | null = raw;
    if (!raw) {
      if (!allowEmpty) {
        setError("Required");
        return;
      }
      parsed = null;
    } else if (type === "money") {
      const n = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(n) || n < 0) return setError("Enter an amount");
      parsed = Math.round(n * 100) / 100;
    } else if (type === "int") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) return setError("Whole number");
      parsed = n;
    }
    committing.current = true;
    setEditing(false);
    try {
      const ok = await onCommit(parsed);
      if (ok === false) {
        setEditing(true);
      }
    } finally {
      committing.current = false;
    }
  };

  if (editing) {
    return (
      <span className={cn("relative block", className)}>
        <input
          ref={inputRef}
          aria-label={label}
          aria-invalid={Boolean(error)}
          inputMode={type === "text" ? undefined : type === "int" ? "numeric" : "decimal"}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setEditing(false);
            }
          }}
          className={cn("adm-input h-8 px-2 coarse:h-10", align === "right" && "num text-right", error && "border-destructive")}
        />
        {error ? <span className="absolute left-0 top-full z-10 bg-background text-[11px] text-destructive">{error}</span> : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      aria-label={`${label}: ${display ?? value ?? "empty"}. Edit`}
      className={cn(
        "group inline-flex min-h-8 w-full items-center gap-1.5 border border-transparent px-2 text-left hover:border-border focus-visible:border-ring disabled:cursor-default disabled:hover:border-transparent coarse:min-h-10",
        align === "right" && "num justify-end text-right",
        className
      )}
    >
      {saving ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      <span className={cn("truncate", value == null || value === "" ? "text-muted-foreground" : "")}>
        {display ?? (value == null || value === "" ? placeholder : value)}
      </span>
    </button>
  );
}
