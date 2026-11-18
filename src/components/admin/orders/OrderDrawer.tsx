import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState, SetupNotice, StatusBadge } from "@/components/admin/ui";
import { useAdminPermissions } from "@/lib/admin/roles";
import { useAdminOrders, useOrderMutations, ADMIN_ORDERS_KEY } from "@/lib/admin/use-orders";
import {
  fetchAdminOrder,
  formatDueDate,
  formatOrderDate,
  isOverdue,
  orderTotal,
  paymentLabel,
  shippingLabel,
  type AdminOrder,
  type AdminOrdersPayload,
  type OrderPatch,
} from "@/lib/admin/orders";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/admin/status";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";
import { deleteAdminOrder } from "@/lib/orders-api";
import { formatEGP } from "@/lib/catalog-format";
import type { OrderStatus } from "@/lib/orders-api";

type ProductionForm = {
  due_date: string;
  hours: string;
  minutes: string;
  filament_grams: string;
  filament_material: "" | "PLA" | "PETG";
  production_colour: string;
  printer_name: string;
  admin_notes: string;
};

function formFrom(order: AdminOrder): ProductionForm {
  const mins = order.print_minutes ?? null;
  return {
    due_date: order.due_date || "",
    hours: mins == null ? "" : String(Math.floor(mins / 60)),
    minutes: mins == null ? "" : String(mins % 60),
    filament_grams: order.filament_grams == null ? "" : String(order.filament_grams),
    filament_material: (order.filament_material as ProductionForm["filament_material"]) || "",
    production_colour: order.production_colour || "",
    printer_name: order.printer_name || "",
    admin_notes: order.admin_notes || "",
  };
}

function whatsappHref(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `20${digits.slice(1)}`;
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-5 py-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { canWrite, isFullAdmin } = useAdminPermissions();
  const { changeStatus, patchOrder, pending } = useOrderMutations();
  const detail = useQuery({ queryKey: ["admin-order", orderId], queryFn: () => fetchAdminOrder(orderId!), enabled: Boolean(orderId) });
  // Prefer the list row (it carries optimistic updates), fall back to the detail fetch.
  const list = useAdminOrders();
  const listRow = list.data?.orders.find((o) => o.id === orderId);
  const order: AdminOrder | undefined = listRow ? { ...detail.data?.order, ...listRow } as AdminOrder : detail.data?.order;
  const productionFields = detail.data?.productionFields ?? list.data?.productionFields ?? false;

  const [form, setForm] = useState<ProductionForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (order) setForm(formFrom(order));
    // Reset only when switching orders or after a save lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, order?.updated_at]);

  // Status history changes with every status update; refetch it after one.
  useEffect(() => {
    if (orderId && listRow?.status && detail.data && detail.data.order.status !== listRow.status) void detail.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listRow?.status]);

  const dirty = Boolean(order && form && JSON.stringify(form) !== JSON.stringify(formFrom(order)));

  async function saveForm() {
    if (!order || !form) return;
    const h = form.hours.trim() === "" ? null : Number(form.hours);
    const m = form.minutes.trim() === "" ? null : Number(form.minutes);
    if ((h != null && (!Number.isInteger(h) || h < 0)) || (m != null && (!Number.isInteger(m) || m < 0 || m > 59))) {
      return toast.error("Print time: whole hours, and minutes from 0 to 59");
    }
    const patch: OrderPatch = { admin_notes: form.admin_notes.trim() || null };
    if (productionFields) {
      Object.assign(patch, {
        due_date: form.due_date || null,
        print_minutes: h == null && m == null ? null : (h || 0) * 60 + (m || 0),
        filament_grams: form.filament_grams.trim() === "" ? null : Number(form.filament_grams),
        filament_material: form.filament_material || null,
        production_colour: form.production_colour.trim() || null,
        printer_name: form.printer_name.trim() || null,
      });
    }
    await patchOrder(order, patch, { label: `${order.order_code} saved` });
    void detail.refetch();
  }

  const address = order?.shipping?.address;
  const wa = whatsappHref(order?.customer_phone ?? null);

  return (
    <>
      <Sheet open={Boolean(orderId)} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <div className="border-b border-border px-5 pb-3 pt-4 pr-12">
            <SheetTitle className="num text-lg">{order?.order_code || "Order"}</SheetTitle>
            <SheetDescription className="text-xs">
              {order ? `Placed ${formatOrderDate(order.created_at, true)} · ${order.order_type === "quote" ? "Quote request" : "Website order"}` : "Loading…"}
            </SheetDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {detail.error && !order ? (
              <div className="p-5"><ErrorState error={detail.error} onRetry={() => detail.refetch()} /></div>
            ) : !order ? (
              <div className="space-y-3 p-5" aria-busy="true">
                <div className="h-5 w-1/2 animate-pulse bg-secondary" />
                <div className="h-24 animate-pulse bg-secondary" />
              </div>
            ) : (
              <>
                <Section title="Status">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={order.status} className="text-sm" />
                    {isOverdue(order) ? <span className="text-xs font-semibold text-destructive">Overdue (due {formatDueDate(order.due_date!)})</span> : null}
                    <span className="flex-1" />
                    {canWrite ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Change to
                        <select
                          className="adm-input h-10 w-40 coarse:h-11"
                          value={order.status}
                          disabled={pending[order.id]}
                          onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
                          aria-label={`Status of ${order.order_code}`}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </Section>

                <Section title="Customer">
                  <p className="text-base font-semibold" dir="auto">{order.customer_name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={`mailto:${order.customer_email}`} className="adm-btn h-9"><Mail className="h-4 w-4" aria-hidden="true" /> <span dir="ltr">{order.customer_email}</span></a>
                    {order.customer_phone ? (
                      <a href={`tel:${order.customer_phone}`} className="adm-btn h-9"><Phone className="h-4 w-4" aria-hidden="true" /> <span dir="ltr">{order.customer_phone}</span></a>
                    ) : null}
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener" className="adm-btn h-9"><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp</a>
                    ) : null}
                  </div>
                  {order.customer_notes ? (
                    <p className="mt-3 whitespace-pre-wrap border-l-2 border-rule pl-3 text-sm" dir="auto">{order.customer_notes}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{order.user_id ? "Signed-in customer" : "Guest checkout"}</p>
                </Section>

                <Section title="Delivery and payment">
                  <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Delivery</dt>
                    <dd>{shippingLabel(order)}{order.shipping?.method === "aramex" ? " (fee confirmed after ordering)" : ""}</dd>
                    {address ? (
                      <>
                        <dt className="text-muted-foreground">Address</dt>
                        <dd dir="auto" className="whitespace-pre-line">
                          {[address.line1, address.line2, [address.city, address.governorate].filter(Boolean).join(", ")].filter(Boolean).join("\n")}
                        </dd>
                      </>
                    ) : null}
                    <dt className="text-muted-foreground">Payment</dt>
                    <dd>{paymentLabel(order)}</dd>
                  </dl>
                </Section>

                <Section title="Items">
                  <ul className="divide-y divide-border">
                    {(order.order_items || []).map((it) => {
                      const d = it.item_data || {};
                      return (
                        <li key={it.id} className="py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">
                              <span className="num">{it.qty} ×</span> {it.name}
                              {d.isBundle ? <span className="ml-1 text-xs text-ink">Bundle</span> : null}
                            </p>
                            <p className="num shrink-0 text-right">{it.subtotal != null ? formatEGP(Number(it.subtotal)) : "—"}</p>
                          </div>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {d.primaryColor ? <li>Colour: {d.primaryColor}{d.secondaryColor ? ` / accent ${d.secondaryColor}` : ""}</li> : null}
                            {(d.options || []).map((op) => (
                              <li key={op.groupId}>
                                {op.group}: <span className="text-foreground">{op.value}</span>
                                {op.priceDelta ? <span className="num"> ({op.priceDelta > 0 ? "+" : "−"}{formatEGP(Math.abs(op.priceDelta))})</span> : null}
                              </li>
                            ))}
                            {d.isBundle && d.bundleItems?.length ? <li>Contains: {d.bundleItems.map((b) => `${b.name}${b.qty > 1 ? ` ×${b.qty}` : ""}`).join(", ")}</li> : null}
                            {it.unit_price != null ? <li className="num">Unit price {formatEGP(Number(it.unit_price))}</li> : null}
                          </ul>
                        </li>
                      );
                    })}
                    {!order.order_items?.length ? <li className="py-2 text-sm text-muted-foreground">No items recorded.</li> : null}
                  </ul>
                  <dl className="num mt-2 grid grid-cols-[1fr_auto] gap-y-1 border-t border-border pt-2 text-sm">
                    {order.totals?.subtotal != null ? (<><dt className="text-muted-foreground">Subtotal</dt><dd className="text-right">{formatEGP(Number(order.totals.subtotal))}</dd></>) : null}
                    <dt className="text-muted-foreground">Delivery</dt>
                    <dd className="text-right">{order.shipping?.method === "aramex" ? "Confirmed separately" : formatEGP(Number(order.totals?.shipping || 0))}</dd>
                    <dt className="font-semibold">Total</dt>
                    <dd className="text-right font-semibold">{formatEGP(orderTotal(order))}</dd>
                  </dl>
                </Section>

                {form ? (
                  <Section title="Production and notes">
                    {!productionFields ? (
                      <div className="mb-3">
                        <SetupNotice title="Production fields aren't set up yet" migration={WORKSPACE_MIGRATION}>
                          Internal notes work now.
                        </SetupNotice>
                      </div>
                    ) : null}
                    <fieldset disabled={!canWrite || pending[order.id]} className="grid gap-3 sm:grid-cols-2">
                      {productionFields ? (
                        <>
                          <div>
                            <label htmlFor="o-due" className="adm-label">Due date</label>
                            <input id="o-due" type="date" className="adm-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                          </div>
                          <div>
                            <span className="adm-label" id="o-time-label">Print time</span>
                            <div className="flex items-center gap-1" role="group" aria-labelledby="o-time-label">
                              <input aria-label="Hours" type="number" min={0} className="adm-input num w-20" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                              <span className="text-xs text-muted-foreground">h</span>
                              <input aria-label="Minutes" type="number" min={0} max={59} className="adm-input num w-20" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="o-material" className="adm-label">Material</label>
                            <select id="o-material" className="adm-input" value={form.filament_material} onChange={(e) => setForm({ ...form, filament_material: e.target.value as ProductionForm["filament_material"] })}>
                              <option value="">Not set</option>
                              <option value="PLA">PLA</option>
                              <option value="PETG">PETG</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="o-grams" className="adm-label">Filament used (g)</label>
                            <input id="o-grams" type="number" min={0} step="0.1" className="adm-input num" value={form.filament_grams} onChange={(e) => setForm({ ...form, filament_grams: e.target.value })} />
                          </div>
                          <div>
                            <label htmlFor="o-colour" className="adm-label">Filament colour</label>
                            <input id="o-colour" className="adm-input" maxLength={100} value={form.production_colour} onChange={(e) => setForm({ ...form, production_colour: e.target.value })} />
                          </div>
                          <div>
                            <label htmlFor="o-printer" className="adm-label">Printer</label>
                            <input id="o-printer" className="adm-input" maxLength={100} placeholder="Which printer it's on" value={form.printer_name} onChange={(e) => setForm({ ...form, printer_name: e.target.value })} />
                          </div>
                        </>
                      ) : null}
                      <div className="sm:col-span-2">
                        <label htmlFor="o-notes" className="adm-label">Internal notes (customers never see these)</label>
                        <textarea id="o-notes" dir="auto" className="adm-textarea" maxLength={4000} value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
                      </div>
                    </fieldset>
                    {canWrite ? (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        {dirty ? <span className="mr-auto text-xs text-amber-300">Unsaved changes</span> : null}
                        <button type="button" className="adm-btn" disabled={!dirty} onClick={() => setForm(formFrom(order))}>Discard</button>
                        <button type="button" className="adm-btn-primary" disabled={!dirty || pending[order.id]} onClick={saveForm}>
                          {pending[order.id] ? "Saving…" : "Save"}
                        </button>
                      </div>
                    ) : null}
                  </Section>
                ) : null}

                <Section title="Status history">
                  {detail.data?.history.length ? (
                    <ol className="space-y-1.5 text-sm">
                      {detail.data.history.map((h) => (
                        <li key={h.id} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="num w-36 shrink-0 text-xs text-muted-foreground">{formatOrderDate(h.created_at, true)}</span>
                          <span>
                            {h.old_status ? `${STATUS_LABEL[h.old_status as OrderStatus] || h.old_status} → ` : ""}
                            <span className="font-medium">{STATUS_LABEL[h.new_status as OrderStatus] || h.new_status}</span>
                            {h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">{detail.isPending ? "Loading…" : "No history recorded."}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Recorded by the database on every status change. It doesn't record who made the change.</p>
                </Section>

                {isFullAdmin ? (
                  <div className="px-5 py-4">
                    <button type="button" className="adm-btn-danger" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete order…
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {order?.order_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              The order, its items and its history are removed for good, including from the customer's account. To stop an order, set it
              to Cancelled instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!order) return;
                setDeleting(true);
                try {
                  await deleteAdminOrder(order.id);
                  qc.setQueryData<AdminOrdersPayload>(ADMIN_ORDERS_KEY, (prev) => (prev ? { ...prev, orders: prev.orders.filter((o) => o.id !== order.id) } : prev));
                  toast.success(`Deleted ${order.order_code}`);
                  setConfirmDelete(false);
                  onClose();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
