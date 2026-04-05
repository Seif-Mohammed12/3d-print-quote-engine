export function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "3d.print.ittt@gmail.com";
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

export function isResendConfigured() {
  return Boolean(getResendApiKey());
}

export async function sendResendEmail({ to, from, subject, html, attachments }) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    const err = new Error("Server misconfigured: RESEND_API_KEY is not set");
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
    const err = new Error(body?.message || `Resend API error (${response.status})`);
    err.status = response.status;
    err.details = body;
    throw err;
  }

  return body;
}
