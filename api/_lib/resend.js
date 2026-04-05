export function getResendFromEmail() {
  return (process.env.RESEND_FROM_EMAIL || "").trim();
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

export function isResendConfigured() {
  return Boolean(getResendApiKey() && getResendFromEmail());
}

function getEmailDomain(from) {
  const raw = String(from || "").trim();
  const match = raw.match(/<([^>]+)>$/);
  const address = (match ? match[1] : raw).trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at === -1) return "";
  return address.slice(at + 1);
}

function isLikelyUnverifiablePersonalDomain(domain) {
  return ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"].includes(domain);
}

export async function sendResendEmail({ to, from, subject, html, attachments }) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    const err = new Error("Server misconfigured: RESEND_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  if (!from) {
    const err = new Error(
      "Server misconfigured: RESEND_FROM_EMAIL is not set. Use a sender from a verified domain in Resend."
    );
    err.status = 500;
    throw err;
  }

  const senderDomain = getEmailDomain(from);
  if (isLikelyUnverifiablePersonalDomain(senderDomain)) {
    const err = new Error(
      `Invalid RESEND_FROM_EMAIL domain (${senderDomain}). Use a verified custom domain in Resend, e.g. no-reply@yourdomain.com.`
    );
    err.status = 500;
    throw err;
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments.map((file) => ({
      filename: file.filename,
      content: file.content,
      content_type: file.type || "application/octet-stream",
    }));
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const lowerMessage = String(body?.message || "").toLowerCase();
    const domainNotVerified =
      lowerMessage.includes("domain is not verified") ||
      lowerMessage.includes("verify your domain") ||
      lowerMessage.includes("from address");

    const message = domainNotVerified
      ? "Resend sender domain is not verified. Set RESEND_FROM_EMAIL to an address on a verified domain in Resend and try again."
      : body?.message || `Resend API error (${response.status})`;

    const err = new Error(message);
    err.status = response.status;
    err.details = body;
    throw err;
  }

  return body;
}
