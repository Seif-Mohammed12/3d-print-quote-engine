import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ADMIN_NAV } from "@/components/admin/nav";
import { useAdminPermissions } from "@/lib/admin/roles";
import { downloadText, fetchAdminOrders, ordersToCsv, todayISO } from "@/lib/admin/orders";
import { ADMIN_CATALOG_KEY, fetchAdminCatalogue } from "@/lib/admin/catalogue";
import { STATUS_LABEL } from "@/lib/admin/status";
import { ADMIN_ORDERS_KEY } from "@/lib/admin/use-orders";

/**
 * ⌘K / Ctrl+K. Only navigation and actions that existing APIs complete safely: jumping to a
 * page, an order or a product, starting a draft product (managers), and exporting orders to CSV.
 */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { canWrite } = useAdminPermissions();

  const orders = useQuery({ queryKey: ADMIN_ORDERS_KEY, queryFn: fetchAdminOrders, enabled: open, staleTime: 30_000 });
  const catalog = useQuery({ queryKey: ADMIN_CATALOG_KEY, queryFn: fetchAdminCatalogue, enabled: open, staleTime: 30_000 });

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a page, order code, customer or product…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Go to">
          {ADMIN_NAV.flatMap((item) =>
            item.children
              ? item.children.map((c) => ({ label: c.label === "Products" ? "Catalogue · Products" : `Catalogue · ${c.label}`, href: c.href, icon: item.icon }))
              : [{ label: item.label, href: item.href, icon: item.icon }]
          ).map((entry) => {
            const Icon = entry.icon;
            return (
              <CommandItem key={entry.href} value={`go ${entry.label}`} onSelect={() => go(entry.href)}>
                <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                {entry.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Actions">
          {canWrite ? (
            <CommandItem value="action new product draft" onSelect={() => go("/admin/catalogue?new=1")}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New product (starts as a draft)
            </CommandItem>
          ) : null}
          <CommandItem
            value="action export orders csv"
            onSelect={async () => {
              onOpenChange(false);
              try {
                const data = orders.data ?? (await fetchAdminOrders());
                downloadText(`orders-${todayISO()}.csv`, ordersToCsv(data.orders));
                toast.success(`Exported ${data.orders.length} orders`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Export failed");
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export all orders as CSV
          </CommandItem>
        </CommandGroup>
        {orders.data?.orders.length ? (
          <CommandGroup heading="Orders">
            {orders.data.orders.slice(0, 200).map((o) => (
              <CommandItem
                key={o.id}
                value={`order ${o.order_code} ${o.customer_name} ${o.customer_email}`}
                onSelect={() => go(`/admin/orders?order=${o.id}`)}
              >
                <span className="num w-40 shrink-0 font-medium">{o.order_code}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground" dir="auto">
                  {o.customer_name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{STATUS_LABEL[o.status]}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {catalog.data?.products.length ? (
          <CommandGroup heading="Products">
            {catalog.data.products.map((p) => (
              <CommandItem key={p.id} value={`product ${p.name} ${p.slug}`} onSelect={() => go(`/admin/catalogue?product=${p.id}`)}>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{p.is_published ? "Published" : "Draft"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
