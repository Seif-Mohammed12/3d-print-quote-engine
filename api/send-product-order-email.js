import sgMail from "@sendgrid/mail";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  const method = event?.httpMethod || "GET";

  if (method === "OPTIONS") return json(200, { ok: true });
  if (method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!process.env.SENDGRID_API_KEY) {
      return json(500, { error: "Server misconfigured: SENDGRID_API_KEY is not set" });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const bodyRaw = event?.body || "";
    const parsed = JSON.parse(bodyRaw);

    const adminTo = process.env.ADMIN_EMAIL || "3d.print.ittt@gmail.com";
    const from = process.env.SENDGRID_FROM_EMAIL || "3d.print.ittt@gmail.com";

    const customerEmail = parsed?.customer?.email;
    if (!customerEmail) return json(400, { error: "Missing customer email" });

    const orderId = `PO-${Date.now()}`;

    const adminHtml = createAdminHtml(orderId, parsed);
    const customerHtml = createCustomerHtml(orderId, parsed);

    await Promise.all([
      sgMail.send({
        to: adminTo,
        from,
        subject: `🛒 Product order ${orderId} — ${parsed?.product?.name || "Product"}`,
        html: adminHtml,
      }),
      sgMail.send({
        to: customerEmail,
        from,
        subject: `✓ Order received (${orderId}) — 3D Print It`,
        html: customerHtml,
      }),
    ]);

    return json(200, { success: true, orderId });
  } catch (err) {
    const details = {
      message: err?.message,
      code: err?.code,
      status: err?.response?.statusCode,
      errors: err?.response?.body?.errors,
    };
    console.error("❌ SendGrid error:", JSON.stringify(details, null, 2));
    return json(500, { error: err?.message || "Unknown error", details });
  }
};

function safe(v) {
  return String(v ?? "").replace(/[<>]/g, "");
}

function createAdminHtml(orderId, payload) {
  const p = payload?.product || {};
  const c = payload?.customer || {};
  const ship = payload?.shipping || {};
  const pay = payload?.payment || {};
  const totals = payload?.totals || {};

  const addr = ship?.address
    ? `${safe(ship.address.line1)}<br/>${safe(ship.address.line2)}<br/>${safe(ship.address.city)}, ${safe(ship.address.governorate)}`
    : "Pickup";

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 24px;">New Product Order</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">Order ID: ${safe(orderId)}</p>
      </div>

      <div style="padding: 24px 28px;">
        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Customer</h3>
        <p style="margin: 0 0 14px; font-size: 14px;">
          <strong>Name:</strong> ${safe(c.name)}<br/>
          <strong>Email:</strong> ${safe(c.email)}<br/>
          <strong>Phone:</strong> ${safe(c.phone)}
        </p>
        ${c.notes ? `<p style="margin: 0 0 14px; font-size: 14px;"><strong>Notes:</strong><br/>${safe(c.notes)}</p>` : ""}

        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Brand</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(payload?.brand)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Product</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Qty</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.qty)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Primary color</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.primaryColor)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Secondary color</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.secondaryColor)}</td></tr>
        </table>

        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Shipping & Payment</h3>
        <p style="margin: 0 0 14px; font-size: 14px;">
          <strong>Shipping:</strong> ${safe(ship.method)}<br/>
          <strong>Address:</strong><br/>${addr}<br/>
          <strong>Payment:</strong> ${safe(pay.method)}
        </p>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; font-size: 14px;">
          <strong>Totals</strong><br/>
          Subtotal: EGP${safe(totals.subtotal)}<br/>
          Shipping: EGP${safe(totals.shipping)}<br/>
          Total: EGP${safe(totals.total)}
        </div>
      </div>
    </div>
  </div>
  `;
}

function createCustomerHtml(orderId, payload) {
  const p = payload?.product || {};
  const ship = payload?.shipping || {};
  const pay = payload?.payment || {};
  const totals = payload?.totals || {};

  const shippingLabel = ship?.method === "pickup" ? "Pickup from store" : "Shipping by Aramex (cost to be confirmed)";
  const paymentLabel = pay?.method === "cod" ? "Cash on delivery" : "Instapay";

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 24px;">Order Received</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">Thanks — we received your product order.</p>
      </div>

      <div style="padding: 24px 28px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Order ID:</strong> ${safe(orderId)}
          </p>
        </div>

        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Your Selection</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Product</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Qty</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.qty)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Primary color</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.primaryColor)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Secondary color</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${safe(p.secondaryColor)}</td></tr>
        </table>

        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Shipping & Payment</h3>
        <p style="margin: 0 0 14px; font-size: 14px;">
          <strong>Shipping:</strong> ${safe(shippingLabel)}<br/>
          <strong>Payment:</strong> ${safe(paymentLabel)}
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; font-size: 14px;">
          <strong>Totals</strong><br/>
          Subtotal: EGP${safe(totals.subtotal)}<br/>
          Shipping: EGP${safe(totals.shipping)}<br/>
          Total: EGP${safe(totals.total)}
        </div>

        <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">
          Need to edit something? Reply to this email or contact us on WhatsApp: +20 109 922 8486.
        </p>
      </div>
    </div>
  </div>
  `;
}

