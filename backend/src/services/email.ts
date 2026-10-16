/**
 * Email service using Resend.
 *
 * The RESEND_API_KEY environment variable must be set on the server.
 * The RESEND_FROM_EMAIL variable sets the "from" address (defaults to
 * onboarding@resend.dev which is Resend's sandbox — only works in test mode).
 *
 * CLIENTENDURL / SERVICEENDURL (already used for CORS) are re-used here to
 * generate the correct panel-specific reset links.
 */

import { Resend } from "resend";

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY environment variable is not set. Email delivery is unavailable."
    );
  }
  return new Resend(key);
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "ATLASWANDERS <noreply@atlaswanders.com>"
  );
}

export type Panel = "customer" | "provider";

function getPanelBaseUrl(panel: Panel): string {
  const raw =
    panel === "customer"
      ? process.env.CLIENTENDURL || process.env.CLIENT_URL || process.env.NEXT_PUBLIC_CLIENT_URL
      : process.env.SERVICEENDURL || process.env.SERVICE_URL || process.env.NEXT_PUBLIC_SERVICE_URL;

  if (!raw?.trim()) {
    throw new Error(
      `Base URL for the ${panel} panel is not configured ` +
        `(${panel === "customer" ? "CLIENTENDURL" : "SERVICEENDURL"}).`
    );
  }
  return raw.trim().replace(/\/+$/, "");
}

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
  panel: Panel
): Promise<void> {
  const baseUrl = getPanelBaseUrl(panel);
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const panelLabel =
    panel === "customer"
      ? "ATLASWANDERS Customer Portal"
      : "ATLASWANDERS Service Provider Portal";

  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Reset your ATLASWANDERS password",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0B2545;padding:28px 40px;text-align:center;">
              <span style="color:#D9A441;font-size:22px;font-weight:700;letter-spacing:0.5px;">ATLAS<span style="color:#ffffff;">WANDERS</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
              <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
                We received a request to reset the password for your <strong>${panelLabel}</strong> account.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                Click the button below to choose a new password. This link is valid for
                <strong>1 hour</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#0B2545;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color:#0B2545;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email —
                your password will not change. Reset links expire after 1 hour.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Reset your ATLASWANDERS password\n\nVisit the link below to reset your password. It expires in 1 hour and can only be used once.\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });

  if (error) {
    // Never expose the raw error object — it may contain API key hints.
    console.error("[email] Resend delivery failed:", error.name, error.message);
    throw new Error("Failed to send the password reset email. Please try again later.");
  }
}
