import { json } from "./_lib/http.js";
import { getResendFromEmail, isResendConfigured, sendResendEmail } from "./_lib/resend.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validate(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (name.length < 2 || name.length > 100) return { error: "Name must be 2 to 100 characters." };
  if (!EMAIL_RE.test(email) || email.length > 100) return { error: "Email address doesn't look valid." };
  if (message.length < 10 || message.length > 2000) return { error: "Message must be 10 to 2000 characters." };

  return { value: { name, email, message } };
}

export const handler = async (event) => {
  const method = event?.httpMethod || "GET";
  if (method === "OPTIONS") return json(200, { ok: true });
  if (method !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try {
    const raw = Buffer.from(event?.body ?? "", event?.isBase64Encoded ? "base64" : "utf8").toString("utf8");
    body = JSON.parse(raw || "{}");
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }

  const { value, error } = validate(body);
  if (error) return json(400, { error });

  if (!isResendConfigured()) {
    console.error("contact-message: RESEND_API_KEY / RESEND_FROM_EMAIL not set");
    return json(503, { error: "Email delivery isn't configured on the server." });
  }

  const adminTo = process.env.ADMIN_EMAIL || "3d.print.ittt@gmail.com";

  try {
    await sendResendEmail({
      to: adminTo,
      from: getResendFromEmail(),
      reply_to: value.email,
      subject: `Contact form: ${value.name}`,
      html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
    <h2>New contact message</h2>
    <p>
      <strong>Name:</strong> ${escapeHtml(value.name)}<br/>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(value.email)}">${escapeHtml(value.email)}</a>
    </p>
    <hr/>
    <p style="white-space: pre-wrap;" dir="auto">${escapeHtml(value.message)}</p>
  </div>
  `,
    });
    return json(200, { success: true });
  } catch (err) {
    console.error("contact-message: Resend error", err?.status, err?.message, err?.details);
    return json(502, { error: "The email service rejected the message." });
  }
};
