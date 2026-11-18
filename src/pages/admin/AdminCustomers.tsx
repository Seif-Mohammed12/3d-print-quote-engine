import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, SkeletonRows, StatusBadge } from "@/components/admin/ui";
import { useAdminOrders } from "@/lib/admin/use-orders";
import { formatOrderDate, orderTotal, type AdminOrder } from "@/lib/admin/orders";
import { formatEGP } from "@/lib/catalog-format";

type Customer = {
  key: string;
  name: string;
  email: string;
  phone: string | null;
  orders: AdminOrder[];
  spent: number;
  last: string;
  hasAccount: boolean;
};

/**
 * Customers, as seen through their orders: one row per email address. There is no separate
 * customer database to edit; everything here comes from the orders table.
 */
export default function AdminCustomers() {
  const { data, isPending, error, refetch, isRefetching } = useAdminOrders();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const o of data?.orders ?? []) {
      const key = o.customer_email.trim().toLowerCase();
      const c = map.get(key) || { key, name: o.customer_name, email: o.customer_email, phone: o.customer_phone, orders: [], spent: 0, last: o.created_at, hasAccount: false };
      c.orders.push(o);
      if (o.status !== "cancelled") c.spent += orderTotal(o);
      if (o.created_at >= c.last) {
        c.last = o.created_at;
        c.name = o.customer_name;
        c.phone = o.customer_phone || c.phone;
      }
      if (o.user_id) c.hasAccount = true;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [data]);

  const q = search.trim().toLowerCase();
  const visible = q ? customers.filter((c) => [c.name, c.email, c.phone || ""].some((v) => v.toLowerCase().includes(q))) : customers;
  const repeat = customers.filter((c) => c.orders.filter((o) => o.status !== "cancelled").length > 1).length;

  return (
    <AdminShell title="Customers" description="Everyone who has ordered on the website, grouped by email address.">
      <div className="space-y-4">
        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" aria-label="Search customers" placeholder="Name, email or phone" className="adm-input pl-8" value={search} onChange={(e) => setSearch(e.target.value)} dir="auto" />
          </div>
          {!isPending ? (
            <p className="num text-xs text-muted-foreground">
              {customers.length} customers · {repeat} ordered more than once (cancelled orders not counted)
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-border bg-card">
          {isPending ? (
            <SkeletonRows rows={5} />
          ) : visible.length === 0 ? (
            <EmptyState title={customers.length ? "No customers match" : "No customers yet"}>
              {customers.length ? "Try another search." : "Customers appear here after their first website order."}
            </EmptyState>
          ) : (
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="adm-th">Customer</th>
                  <th className="adm-th">Contact</th>
                  <th className="adm-th text-right">Orders</th>
                  <th className="adm-th text-right" title="Order totals excluding cancelled orders">Spent</th>
                  <th className="adm-th">Last order</th>
                  <th className="adm-th">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((c) => (
                  <Fragment key={c.key}>
                    <tr className="hover:bg-accent/30">
                      <td className="adm-td">
                        <button type="button" className="text-left font-medium hover:underline" aria-expanded={open === c.key} onClick={() => setOpen(open === c.key ? null : c.key)} dir="auto">
                          {c.name}
                        </button>
                      </td>
                      <td className="adm-td">
                        <p dir="ltr" className="text-left">{c.email}</p>
                        {c.phone ? <p dir="ltr" className="text-left text-xs text-muted-foreground">{c.phone}</p> : null}
                      </td>
                      <td className="adm-td num text-right">{c.orders.length}</td>
                      <td className="adm-td num text-right">{formatEGP(c.spent)}</td>
                      <td className="adm-td num">{formatOrderDate(c.last)}</td>
                      <td className="adm-td text-xs text-muted-foreground">{c.hasAccount ? "Signed up" : "Guest"}</td>
                    </tr>
                    {open === c.key ? (
                      <tr className="bg-background">
                        <td colSpan={6} className="px-6 py-2">
                          <ul className="divide-y divide-border">
                            {c.orders.map((o) => (
                              <li key={o.id} className="flex items-center gap-4 py-1.5 text-sm">
                                <Link to={`/admin/orders?order=${o.id}`} className="num w-40 font-medium hover:underline">{o.order_code}</Link>
                                <span className="num w-28 text-muted-foreground">{formatOrderDate(o.created_at)}</span>
                                <StatusBadge status={o.status} />
                                <span className="num ml-auto">{formatEGP(orderTotal(o))}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Offline sales entered by hand aren't included. Customer details can only be changed by the customer in their account.
        </p>
      </div>
    </AdminShell>
  );
}
