import nodemailer from "nodemailer";

// ============================================================================
// SMTP TRANSPORTER
// ============================================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_NAME = process.env.SMTP_FROM_NAME || "Qvick";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";

/**
 * Verify SMTP connection on startup (non-blocking).
 * Logs a warning if email is not configured rather than crashing.
 */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "SMTP credentials not configured — email sending is disabled. " +
        "Set SMTP_USER and SMTP_PASS in .env to enable.",
    );
    return false;
  }

  try {
    await transporter.verify();
    console.log("Email service connected successfully");
    return true;
  } catch (error) {
    console.warn("Email service connection failed:", (error as Error).message);
    return false;
  }
}

// ============================================================================
// SEND INVITE EMAIL
// ============================================================================

interface InviteEmailParams {
  toEmail: string;
  inviteToken: string;
  businessName: string;
  displayName?: string | null;
}

export async function sendInviteEmail({
  toEmail,
  inviteToken,
  businessName,
  displayName,
}: InviteEmailParams): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      `📧 Email not sent to ${toEmail} (SMTP not configured). ` +
        `Invite link: ${getInviteUrl(inviteToken)}`,
    );
    return false;
  }

  const inviteUrl = getInviteUrl(inviteToken);
  const greeting = displayName ? `Kedves ${displayName}` : "Kedves Kolléga";

  const html = `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff5100 0%, #ff8200 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:8px 16px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:24px;font-weight:bold;">Q</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">
                Meghívó a Qvick csapatba
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
                ${greeting},
              </p>
              <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
                A <strong>${businessName}</strong> meghívott, hogy csatlakozz a csapatukhoz a Qvick platformon.
              </p>
              <p style="margin:0 0 28px;color:#666;font-size:14px;line-height:1.5;">
                A csatlakozáshoz kattints az alábbi gombra, és hozd létre a fiókodat. Ezzel hozzáférést kapsz a foglalási rendszerhez és az ügyfelekhez.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${inviteUrl}" 
                       style="display:inline-block;background-color:#ff5100;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">
                      Meghívó elfogadása
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;color:#888;font-size:13px;line-height:1.5;">
                Ha a gomb nem működik, másold be az alábbi linket a böngésződbe:
              </p>
              <p style="margin:0 0 28px;color:#ff5100;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#ff5100;text-decoration:underline;">${inviteUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
              
              <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
                Ha nem ismered a <strong>${businessName}</strong> céget, vagy nem várt meghívót kaptál, kérlek hagyd figyelmen kívül ezt az e-mailt.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">
                © ${new Date().getFullYear()} Qvick. Minden jog fenntartva.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting},

A "${businessName}" meghívott, hogy csatlakozz a csapatukhoz a Qvick platformon.

Csatlakozás: ${inviteUrl}

Ha nem ismered a "${businessName}" céget, kérlek hagyd figyelmen kívül ezt az e-mailt.

© ${new Date().getFullYear()} Qvick`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `Meghívó: Csatlakozz a ${businessName} csapatához – Qvick`,
      text,
      html,
    });

    console.log(`Invite email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send invite email to ${toEmail}:`, (error as Error).message);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getInviteUrl(token: string): string {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${baseUrl}/meghivas/${token}`;
}
