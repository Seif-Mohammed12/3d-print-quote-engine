// Product order emails, built only from data the server has already validated and priced.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escapeHtml;
const LABEL = 'style="padding: 6px 0; color: #6b7280;"';
const VALUE = 'style="padding: 6px 0; text-align: right; font-weight: 600;"';

function row(label, value) {
  return `<tr><td ${LABEL}>${label}</td><td ${VALUE}>${value}</td></tr>`;
}

function bundleContents(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.map((it) => `${e(it?.name)}${Number(it?.qty || 1) > 1 ? ` x${e(it.qty)}` : ""}`).join(", ");
}

function itemRows(items, { forAdmin }) {
  return items
    .map((it, i) => {
      const contents = it.isBundle ? bundleContents(it.bundleItems) : "";
      return `
        <tr><td colspan="2" style="padding: 10px 0 4px; font-size: 15px; font-weight: 700; color: #1e3a8a; border-top: ${i === 0 ? "none" : "1px solid #e5e7eb"};">Item ${i + 1}</td></tr>
        ${row("Product", `${e(it.name)}${it.brand ? ` (${e(it.brand)})` : ""}`)}
        ${row("Type", it.isBundle ? "Bundle" : "Product")}
        ${row("Qty", e(it.qty))}
        ${forAdmin ? row("Unit price", `EGP${e(it.unitPrice)}`) : ""}
        ${row("Primary color", e(it.primaryColor))}
        ${it.secondaryColor ? row("Secondary color", e(it.secondaryColor)) : ""}
        ${(Array.isArray(it.options) ? it.options : []).map((o) => row(e(o.group), `${e(o.value)}${o.priceDelta ? ` (${o.priceDelta > 0 ? "+" : "-"}EGP${e(Math.abs(o.priceDelta))})` : ""}`)).join("")}
        ${contents ? row("Bundle contents", contents) : ""}
        ${forAdmin && it.discount ? row("List / sale", `EGP${e(it.discount.oldPrice)} → EGP${e(it.discount.newPrice)}`) : ""}
        ${row("Line total", `EGP${e(it.subtotal)}`)}`;
    })
    .join("");
}

function shell(title, subtitle, body, width) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
    <div style="max-width: ${width}px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #1d4ed8; color: white; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 24px;">${title}</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">${subtitle}</p>
      </div>
      <div style="padding: 24px 28px;">${body}</div>
    </div>
  </div>`;
}

function totalsBlock(totals) {
  return `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; font-size: 14px;">
      <strong>Totals</strong><br/>
      Subtotal: EGP${e(totals.subtotal)}<br/>
      Shipping: EGP${e(totals.shipping)}<br/>
      Total: EGP${e(totals.total)}
    </div>`;
}

const H3 = 'style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;"';
const TABLE = 'style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 14px;"';

export function buildAdminOrderHtml({ orderCode, customer, shipping, payment, items, totals }) {
  const address = shipping.address
    ? `${e(shipping.address.line1)}<br/>${e(shipping.address.line2)}<br/>${e(shipping.address.city)}, ${e(shipping.address.governorate)}`
    : "Pickup";

  return shell(
    "New Product Order",
    `Order ID: ${e(orderCode)}`,
    `
      <h3 ${H3}>Customer</h3>
      <p style="margin: 0 0 14px; font-size: 14px;" dir="auto">
        <strong>Name:</strong> ${e(customer.name)}<br/>
        <strong>Email:</strong> ${e(customer.email)}<br/>
        <strong>Phone:</strong> ${e(customer.phone)}
      </p>
      ${customer.notes ? `<p style="margin: 0 0 14px; font-size: 14px; white-space: pre-wrap;" dir="auto"><strong>Notes:</strong><br/>${e(customer.notes)}</p>` : ""}
      <h3 ${H3}>Order Details</h3>
      <table ${TABLE}>${itemRows(items, { forAdmin: true })}</table>
      <h3 ${H3}>Shipping &amp; Payment</h3>
      <p style="margin: 0 0 14px; font-size: 14px;" dir="auto">
        <strong>Shipping:</strong> ${e(shipping.method)}<br/>
        <strong>Address:</strong><br/>${address}<br/>
        <strong>Payment:</strong> ${e(payment.method)}
      </p>
      ${totalsBlock(totals)}`,
    680
  );
}

export function buildCustomerOrderHtml({ orderCode, shipping, payment, items, totals }) {
  const shippingLabel = shipping.method === "pickup" ? "Pickup from store" : "Shipping by Aramex (cost to be confirmed)";
  const paymentLabel = payment.method === "cod" ? "Cash on delivery" : "Instapay";

  return shell(
    "Order Received",
    "Thanks — we received your product order.",
    `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
        <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> ${e(orderCode)}</p>
      </div>
      <h3 ${H3}>Your Selection</h3>
      <table ${TABLE}>${itemRows(items, { forAdmin: false })}</table>
      <h3 ${H3}>Shipping &amp; Payment</h3>
      <p style="margin: 0 0 14px; font-size: 14px;">
        <strong>Shipping:</strong> ${e(shippingLabel)}<br/>
        <strong>Payment:</strong> ${e(paymentLabel)}
      </p>
      ${totalsBlock(totals)}
      <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">
        Need to edit something? Reply to this email or contact us on WhatsApp: +20 109 922 8486.
      </p>`,
    620
  );
}

export function orderEmailSubjects({ orderCode, items }) {
  const first = items[0]?.name || "Product";
  const label = items.length > 1 ? `${first} +${items.length - 1} more` : first;
  // Subjects are plain text headers: strip line breaks so nothing can be injected.
  const clean = (v) => String(v).replace(/[\r\n]+/g, " ");
  return {
    admin: clean(`🛒 Product order ${orderCode} — ${label}`),
    customer: clean(`✓ Order received (${orderCode}) — 3D Print It`),
  };
}
