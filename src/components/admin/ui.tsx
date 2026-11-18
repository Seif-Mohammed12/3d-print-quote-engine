import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { OrderStatus } from "@/lib/orders-api";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/admin/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", tone.text, className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      {title || action ? (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 border border-destructive/40 bg-destructive/5 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">{message}</p>
      {onRetry ? (
        <button type="button" className="adm-btn h-8" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} aria-hidden="true" /> Try again
        </button>
      ) : null}
    </div>
  );
}

/** Notice for a feature whose migration hasn't been run. */
export function SetupNotice({ title, migration, children }: { title: string; migration: string; children?: ReactNode }) {
  return (
    <div className="border border-amber-300/40 bg-amber-300/5 px-4 py-3 text-sm">
      <p className="font-semibold text-amber-200">{title}</p>
      <p className="mt-1 text-muted-foreground">
        Run <code className="text-foreground">{migration}</code> in the Supabase SQL editor, then reload this page.
      </p>
      {children ? <div className="mt-1 text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-4 w-24 animate-pulse bg-secondary" />
          <div className="h-4 flex-1 animate-pulse bg-secondary" />
          <div className="h-4 w-16 animate-pulse bg-secondary" />
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ReadOnlyNotice() {
  return (
    <p className="border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      You have view-only access. Ask an admin for the manager role to make changes.
    </p>
  );
}
