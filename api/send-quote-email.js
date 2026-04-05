import { getResendFromEmail, isResendConfigured, sendResendEmail } from "./_lib/resend.js";
import busboy from "busboy";
import { Readable } from "node:stream";

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

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "undefined") continue;
    normalized[String(k).toLowerCase()] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return normalized;
}

function readableFromEventBody(event) {
  const raw = event?.body ?? "";
  const buf = Buffer.from(raw, event?.isBase64Encoded ? "base64" : "utf8");
  return Readable.from(buf);
}

export const handler = async (event) => {
  const method = event?.httpMethod || "GET";
  if (method === "OPTIONS") return json(200, { ok: true });
  if (method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!isResendConfigured()) {
      return json(500, { error: "Server misconfigured: RESEND_API_KEY and RESEND_FROM_EMAIL must be set" });
    }

    const headers = normalizeHeaders(event?.headers);
    if (!headers["content-type"]?.includes("multipart/form-data")) {
      return json(400, { error: "Expected multipart/form-data" });
    }

    const bb = busboy({
      headers,
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    let quoteDetails = null;
    let fileAttachment = null;
    let parseError = null;
    let fileProcessing = 0;

    return await new Promise((resolve) => {
      bb.on("field", (fieldname, val) => {
        if (fieldname === "quoteDetails") {
          try {
            quoteDetails = JSON.parse(val);
          } catch {
            parseError = "Invalid JSON in quoteDetails";
          }
        }
      });

      bb.on("file", (_fieldname, file, info) => {
        fileProcessing++;
        const chunks = [];
        let size = 0;

        file.on("data", (d) => {
          size += d.length;
          chunks.push(d);
        });

        file.on("end", () => {
          const buffer = Buffer.concat(chunks);
          fileAttachment = {
            filename: info.filename || "model.stl",
            content: buffer.toString("base64"),
            type: "application/octet-stream",
            disposition: "attachment",
          };
          fileProcessing--;
        });

        file.on("error", (err) => {
          parseError = `File upload error: ${err.message}`;
          fileProcessing--;
        });
      });

      bb.on("close", async () => {
        const wait = () =>
          new Promise((r) => {
            if (fileProcessing === 0) return r();
            const t = setInterval(() => {
              if (fileProcessing === 0) {
                clearInterval(t);
                r();
              }
            }, 25);
          });

        await wait();

        if (parseError) return resolve(json(400, { error: parseError }));
        if (!quoteDetails) return resolve(json(400, { error: "Missing quote details" }));
        if (!fileAttachment) return resolve(json(400, { error: "Missing file" }));

        const adminTo = process.env.ADMIN_EMAIL || "3d.print.ittt@gmail.com";
        const from = getResendFromEmail();

        const customerEmail = quoteDetails?.customer?.email;
        if (!customerEmail) return resolve(json(400, { error: "Missing customer email" }));

        const requestId = quoteDetails?.orderCode || `Q-${Date.now()}`;

        try {
          await Promise.all([
            sendResendEmail({
              to: adminTo,
              from,
              subject: `📩 New Quote Request ${requestId} — ${quoteDetails?.file?.name || "3D file"}`,
              html: adminHtml(requestId, quoteDetails),
              attachments: [fileAttachment],
            }),
            sendResendEmail({
              to: customerEmail,
              from,
              subject: `✓ Quote request received (${requestId}) — 3D Print It`,
              html: customerHtml(requestId, quoteDetails),
            }),
          ]);

          resolve(json(200, { success: true, requestId }));
        } catch (err) {
          const details = {
            message: err?.message,
            code: err?.code,
            status: err?.status,
            errors: err?.details,
          };
          console.error("❌ Resend error:", JSON.stringify(details, null, 2));
          resolve(json(500, { error: err?.message || "Email send failed", details }));
        }
      });

      bb.on("error", (err) => {
        resolve(json(400, { error: `Parse error: ${err.message}` }));
      });

      if (!event?.body) return resolve(json(400, { error: "No request body" }));
      readableFromEventBody(event).pipe(bb);
    });
  } catch (err) {
    return json(500, { error: err?.message || "Unknown error" });
  }
};

function safe(v) {
  return String(v ?? "").replace(/[<>]/g, "");
}

function adminHtml(id, d) {
  const c = d.customer || {};
  const s = d.settings || {};
  const est = d.estimate || {};
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
    <h2>New Quote Request</h2>
    <p><strong>Request ID:</strong> ${safe(id)}</p>
    <p><strong>File:</strong> ${safe(d.file?.name)} (${safe(d.file?.type)})</p>
    <hr/>
    <h3>Customer</h3>
    <p>
      <strong>Name:</strong> ${safe(c.name)}<br/>
      <strong>Email:</strong> ${safe(c.email)}<br/>
      <strong>Phone:</strong> ${safe(c.phone)}<br/>
      <strong>Address:</strong> ${safe(c.address || "")}<br/>
    </p>
    ${c.notes ? `<p><strong>Notes:</strong><br/>${safe(c.notes)}</p>` : ""}
    <h3>Print Settings</h3>
    <p>
      <strong>Material:</strong> ${safe(s.material)}<br/>
      <strong>Quality:</strong> ${safe(s.quality)}<br/>
      <strong>Infill:</strong> ${safe(s.infill)}%<br/>
    </p>
    <h3>Estimator</h3>
    <p>
      <strong>Estimated price:</strong> EGP${safe(est.totalPrice)}<br/>
      <strong>Weight:</strong> ${safe(est.weightGrams)}g<br/>
      <strong>Time:</strong> ${safe(est.estimatedTime)}<br/>
    </p>
  </div>
  `;
}

function customerHtml(id, d) {
  const c = d.customer || {};
  const s = d.settings || {};
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 24px;">Quote Request Received</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">Thanks ${safe(c.name || "there")} — we got your file and print settings.</p>
      </div>

      <div style="padding: 24px 28px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Request ID:</strong> ${safe(id)}
          </p>
        </div>

        <h3 style="margin: 0 0 10px; font-size: 17px; color: #1e3a8a;">Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">File</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 600;">${safe(d.file?.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Material</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 600;">${safe(s.material)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Quality</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 600; text-transform: capitalize;">${safe(s.quality)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Infill</td>
            <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 600;">${safe(s.infill)}%</td>
          </tr>
        </table>

        <div style="margin-top: 18px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px;">
          <p style="margin: 0; font-size: 14px; color: #374151;">
            We will review your model and reply with the final price and timeline as soon as possible.
          </p>
        </div>

        <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">
          Need to update anything? Reply to this email or message us on WhatsApp: +20 109 922 8486.
        </p>
      </div>
    </div>
  </div>
  `;
}

