import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { getResendFromEmail, isResendConfigured, sendResendEmail } from "./_lib/resend.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function buildCustomerResetEmailHtml({ email, resetLink }) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 24px;">Reset your password</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">We received a password reset request for ${email}.</p>
      </div>

      <div style="padding: 24px 28px;">
        <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
          Click the button below to set a new password. This link is time-limited for security.
        </p>

        <a
          href="${resetLink}"
          style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 18px; border-radius: 8px;"
        >
          Reset password
        </a>

        <p style="margin: 18px 0 0; font-size: 13px; color: #6b7280; word-break: break-word;">
          If the button doesn't work, copy and paste this URL into your browser:<br/>
          <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
        </p>

        <p style="margin: 18px 0 0; font-size: 13px; color: #6b7280;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>
  `;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!isResendConfigured()) {
      return json(500, { error: "Server misconfigured: RESEND_API_KEY and RESEND_FROM_EMAIL must be set" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return json(500, { error: "Server misconfigured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" });
    }

    const body = JSON.parse(event.body || "{}");
    const email = String(body?.email || "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo || "").trim();

    if (!isValidEmail(email)) {
      return json(400, { error: "Valid email is required" });
    }

    if (!redirectTo) {
      return json(400, { error: "redirectTo is required" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Do not leak whether an account exists. Return generic success for user-not-found flows.
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("user not found") || msg.includes("no user")) {
        return json(200, {
          success: true,
          message: "If an account exists for this email, a reset link has been sent.",
        });
      }
      return json(500, { error: error.message || "Failed to generate reset link" });
    }

    const resetLink =
      data?.properties?.action_link ||
      data?.properties?.email_otp ||
      data?.action_link ||
      null;

    if (!resetLink || !String(resetLink).startsWith("http")) {
      return json(500, { error: "Failed to generate a valid reset link" });
    }

    await sendResendEmail({
      to: email,
      from: getResendFromEmail(),
      subject: "Reset your password - 3D Print It",
      html: buildCustomerResetEmailHtml({ email, resetLink }),
    });

    return json(200, {
      success: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (err) {
    const details = {
      message: err?.message,
      status: err?.status,
      errors: err?.details,
    };
    console.error("❌ auth-password-reset error:", JSON.stringify(details, null, 2));
    return json(500, { error: err?.message || "Failed to send reset email", details });
  }
};
