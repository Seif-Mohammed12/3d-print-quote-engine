import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { ErrorState, Panel, SkeletonRows } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/api";
import { ROLE_DESCRIPTIONS, useAdminPermissions, type AdminRole } from "@/lib/admin/roles";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";
import { isShopifyCatalogEnabled } from "@/lib/shopify-storefront";
import { cn } from "@/lib/utils";

type SetupStatus = {
  role: AdminRole;
  schema: { categories: boolean; options: boolean; colourFlags: boolean; orderProduction: boolean };
  switches: { legacyQuoteFlow: boolean; orderEmails: boolean; serviceRoleKey: boolean };
};

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center", ok ? "text-emerald-300" : "text-amber-300")}>
        {ok ? <Check className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
      </span>
      <div className="min-w-0">
        <p className="font-medium">
          {label} <span className={cn("ml-1 text-xs font-normal", ok ? "text-emerald-300" : "text-amber-300")}>{ok ? "Ready" : "Not set up"}</span>
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

export default function AdminSettings() {
  const { role } = useAdminPermissions();
  const { data, error, isPending, refetch, isRefetching } = useQuery({
    queryKey: ["admin-setup-status"],
    queryFn: () => adminFetch<SetupStatus>("/api/admin-setup-status"),
  });

  return (
    <AdminShell title="Settings" description="Your access, database setup and the switches that affect the shop.">
      <div className="max-w-3xl space-y-5">
        <Panel title="Your access">
          <div className="px-4 py-3">
            <p>
              Role: <span className="font-semibold capitalize">{role}</span>
            </p>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          <table className="w-full border-t border-border text-sm">
            <caption className="sr-only">What each admin role can do</caption>
            <tbody className="divide-y divide-border">
              {(Object.keys(ROLE_DESCRIPTIONS) as AdminRole[]).map((r) => (
                <tr key={r}>
                  <th scope="row" className="w-28 px-4 py-2 text-left font-medium capitalize">{r}</th>
                  <td className="px-4 py-2 text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Admins and their roles live in the <code>admin_users</code> table in Supabase. Managing them from here isn't built yet.
          </p>
        </Panel>

        <Panel title="Database setup">
          {error ? (
            <div className="p-4"><ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /></div>
          ) : isPending ? (
            <SkeletonRows rows={4} />
          ) : data ? (
            <>
              <ul className="divide-y divide-border">
                <Row ok={data.schema.categories} label="Categories" detail="Data-driven shop categories, category filters and product assignment." />
                <Row ok={data.schema.options} label="Product options" detail="Option groups (size, pattern, finish…), priced at checkout on the server, and photos linked to options." />
                <Row ok={data.schema.colourFlags} label="Colour stock and archive" detail="Mark a library colour out of stock everywhere, or archive it from the picker." />
                <Row ok={data.schema.orderProduction} label="Order production fields" detail="Due date, print time, filament, colour and printer on each order; overdue flags." />
              </ul>
              {Object.values(data.schema).some((v) => !v) ? (
                <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  Run <code className="text-foreground">{WORKSPACE_MIGRATION}</code> once in the Supabase SQL editor, then reload. It's safe to run
                  again.
                </p>
              ) : null}
            </>
          ) : null}
        </Panel>

        <Panel title="Switches">
          {data ? (
            <ul className="divide-y divide-border">
              <Row ok={data.switches.orderEmails} label="Order emails" detail="Resend is configured, so new orders email the studio and the customer." />
              <Row ok={data.switches.serviceRoleKey} label="Server database key" detail="Functions use the Supabase service key. Without it, admin reads fall back to your own permissions." />
              <li className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 w-5" aria-hidden="true" />
                <div>
                  <p className="font-medium">Legacy STL quote flow: {data.switches.legacyQuoteFlow ? <span className="text-amber-300">on</span> : "off"}</p>
                  <p className="text-xs text-muted-foreground">Should stay off. It's controlled by LEGACY_QUOTE_FLOW_ENABLED in Netlify, not from here.</p>
                </div>
              </li>
            </ul>
          ) : null}
          <div className="border-t border-border px-4 py-3">
            <p className="font-medium">Catalogue source: {isShopifyCatalogEnabled ? "Shopify (preview flag on)" : "Supabase"}</p>
            <p className="text-xs text-muted-foreground">
              The shop reads products from Supabase. The Shopify catalogue adapter is kept behind VITE_CATALOG_SOURCE and isn't used by this
              admin.
            </p>
          </div>
        </Panel>

        <Panel title="Offline sales">
          <div className="px-4 py-3 text-sm">
            <p className="text-muted-foreground">Sales made outside the website (markets, direct messages) are entered by hand and shown separately in Insights.</p>
            <Link to="/admin/stats" className="adm-btn mt-3">
              Manage offline sales
            </Link>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
