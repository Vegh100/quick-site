import nodemailer from "nodemailer";
import { logger } from "../lib/logger.js";

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
    logger.warn(
      "SMTP credentials not configured — email sending is disabled. Set SMTP_USER and SMTP_PASS in .env to enable.",
    );
    return false;
  }

  try {
    await transporter.verify();
    logger.info("Email service connected successfully");
    return true;
  } catch (error) {
    logger.warn({ err: error }, "Email service connection failed");
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
    logger.warn(
      { toEmail, inviteUrl: getInviteUrl(inviteToken) },
      "Email not sent (SMTP not configured)",
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

    logger.info({ toEmail }, "Invite email sent");
    return true;
  } catch (error) {
    logger.error({ err: error, toEmail }, "Failed to send invite email");
    return false;
  }
}

// ============================================================================
// VERIFICATION EMAIL
// ============================================================================

interface VerificationEmailParams {
  toEmail: string;
  firstName: string;
  verifyUrl: string;
}

export async function sendVerificationEmail({
  toEmail,
  firstName,
  verifyUrl,
}: VerificationEmailParams): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const greeting = firstName ? `Kedves ${firstName}` : "Kedves Felhasználó";

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; overflow: hidden">
          <tr>
            <td style="background: #FF5100; padding: 24px; text-align: center">
              <h1 style="color: #fff; margin: 0; font-size: 24px">Qvick</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px">
              <p style="font-size: 16px">${greeting},</p>
              <p style="font-size: 16px">Köszönjük a regisztrációt! Kérjük, erősítsd meg az e-mail címedet az alábbi gombra kattintva:</p>
              <p style="text-align: center; margin: 32px 0">
                <a href="${verifyUrl}" style="background: #FF5100; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold">E-mail cím megerősítése</a>
              </p>
              <p style="font-size: 14px; color: #666">A link 24 órán belül érvényes.</p>
              <p style="font-size: 12px; color: #999; margin-top: 24px">Ha nem te regisztráltál, kérjük hagyd figyelmen kívül ezt az e-mailt.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f8f8f8; padding: 16px; text-align: center">
              <p style="color: #999; font-size: 12px; margin: 0">&copy; ${new Date().getFullYear()} Qvick</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting},

Köszönjük a regisztrációt! Kérjük, erősítsd meg az e-mail címedet: ${verifyUrl}

A link 24 órán belül érvényes.

© ${new Date().getFullYear()} Qvick`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: "E-mail cím megerősítése – Qvick",
      text,
      html,
    });

    logger.info({ toEmail }, "Verification email sent");
    return true;
  } catch (error) {
    logger.error({ err: error, toEmail }, "Failed to send verification email");
    return false;
  }
}

// ============================================================================
// BOOKING EMAILS
// ============================================================================

interface BookingEmailParams {
  customerEmail: string;
  customerName: string;
  providerEmail?: string;
  businessName: string;
  serviceName: string;
  scheduledDate: string; // formatted e.g. "2026. február 23."
  scheduledTime: string; // e.g. "14:00"
  duration: number; // minutes
  totalAmount: string; // formatted e.g. "12 500 RON"
  bookingId: string;
}

/**
 * Send booking created email to the customer (and optionally to the provider).
 */
export async function sendBookingCreatedEmail(params: BookingEmailParams): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const {
    customerEmail,
    customerName,
    providerEmail,
    businessName,
    serviceName,
    scheduledDate,
    scheduledTime,
    duration,
    totalAmount,
  } = params;
  const dashboardUrl = `${getBaseUrl()}/ugyfel/foglalasaim`;

  // Email to customer
  const customerHtml = buildEmailLayout({
    title: "Foglalás visszaigazolása",
    headerColor: "#10b981", // green
    body: `
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Kedves ${customerName},
      </p>
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Foglalásodat sikeresen rögzítettük a <strong>${businessName}</strong> szolgáltatónál.
      </p>
      ${bookingDetailsBlock({ serviceName, scheduledDate, scheduledTime, duration, totalAmount, businessName })}
      <p style="margin:20px 0 0;color:#666;font-size:14px;line-height:1.5;">
        A szolgáltató hamarosan visszaigazolja a foglalásodat. Értesítünk, amint ez megtörténik.
      </p>
    `,
    ctaText: "Foglalásaim megtekintése",
    ctaUrl: dashboardUrl,
  });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Foglalás rögzítve – ${serviceName} | ${businessName}`,
      text: `Kedves ${customerName}, foglalásodat rögzítettük: ${serviceName} – ${scheduledDate} ${scheduledTime}. ${businessName}`,
      html: customerHtml,
    });
    logger.info({ customerEmail }, "Booking created email sent to customer");
  } catch (err) {
    logger.error({ err, customerEmail }, "Failed to send booking email to customer");
  }

  // Email to provider
  if (providerEmail) {
    const providerDashboardUrl = `${getBaseUrl()}/szolgaltato/foglalasok`;
    const providerHtml = buildEmailLayout({
      title: "Új foglalás érkezett!",
      headerColor: "#ff5100",
      body: `
        <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
          Új foglalás érkezett a <strong>${businessName}</strong> profilodra!
        </p>
        ${bookingDetailsBlock({ serviceName, scheduledDate, scheduledTime, duration, totalAmount, businessName: `Ügyfél: ${customerName}` })}
        <p style="margin:20px 0 0;color:#666;font-size:14px;line-height:1.5;">
          Kérjük, erősítsd meg vagy utasítsd el a foglalást a vezérlőpultodon.
        </p>
      `,
      ctaText: "Foglalások kezelése",
      ctaUrl: providerDashboardUrl,
    });

    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: providerEmail,
        subject: `Új foglalás: ${customerName} – ${serviceName}`,
        text: `Új foglalás érkezett: ${customerName} – ${serviceName}, ${scheduledDate} ${scheduledTime}.`,
        html: providerHtml,
      });
      logger.info({ providerEmail }, "Booking created email sent to provider");
    } catch (err) {
      logger.error({ err, providerEmail }, "Failed to send booking email to provider");
    }
  }

  return true;
}

/**
 * Send booking confirmed email to the customer.
 */
export async function sendBookingConfirmedEmail(params: BookingEmailParams): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const {
    customerEmail,
    customerName,
    businessName,
    serviceName,
    scheduledDate,
    scheduledTime,
    duration,
    totalAmount,
  } = params;
  const dashboardUrl = `${getBaseUrl()}/ugyfel/foglalasaim`;

  const html = buildEmailLayout({
    title: "Foglalás megerősítve!",
    headerColor: "#10b981",
    body: `
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Kedves ${customerName},
      </p>
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Örömmel értesítünk, hogy a <strong>${businessName}</strong> megerősítette a foglalásodat!
      </p>
      ${bookingDetailsBlock({ serviceName, scheduledDate, scheduledTime, duration, totalAmount, businessName })}
      <p style="margin:20px 0 0;color:#666;font-size:14px;line-height:1.5;">
        Várunk szeretettel a megbeszélt időpontban!
      </p>
    `,
    ctaText: "Foglalás részletei",
    ctaUrl: dashboardUrl,
  });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Megerősítve: ${serviceName} – ${scheduledDate} ${scheduledTime}`,
      text: `Kedves ${customerName}, foglalásodat megerősítették: ${serviceName} – ${scheduledDate} ${scheduledTime}. ${businessName}`,
      html,
    });
    logger.info({ customerEmail }, "Booking confirmed email sent");
    return true;
  } catch (err) {
    logger.error({ err, customerEmail }, "Failed to send confirmation email");
    return false;
  }
}

/**
 * Send booking cancelled email to the affected party.
 */
export async function sendBookingCancelledEmail(
  params: BookingEmailParams & { cancelledByProvider: boolean; cancelReason?: string },
): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const {
    customerEmail,
    customerName,
    businessName,
    serviceName,
    scheduledDate,
    scheduledTime,
    duration,
    totalAmount,
    cancelledByProvider,
    cancelReason,
  } = params;

  const recipientEmail = cancelledByProvider
    ? customerEmail
    : params.providerEmail || customerEmail;
  const recipientName = cancelledByProvider ? customerName : businessName;
  const cancelledByText = cancelledByProvider ? businessName : customerName;

  const html = buildEmailLayout({
    title: "Foglalás lemondva",
    headerColor: "#ef4444", // red
    body: `
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Kedves ${recipientName},
      </p>
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Sajnálattal értesítünk, hogy az alábbi foglalást <strong>${cancelledByText}</strong> lemondta.
      </p>
      ${bookingDetailsBlock({ serviceName, scheduledDate, scheduledTime, duration, totalAmount, businessName })}
      ${
        cancelReason
          ? `
      <div style="margin:20px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
        <p style="margin:0;color:#666;font-size:13px;"><strong>Lemondás oka:</strong></p>
        <p style="margin:4px 0 0;color:#333;font-size:14px;">${cancelReason}</p>
      </div>`
          : ""
      }
    `,
    ctaText: "Vissza a Qvick-re",
    ctaUrl: getBaseUrl(),
  });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Lemondva: ${serviceName} – ${scheduledDate} ${scheduledTime}`,
      text: `Foglalás lemondva: ${serviceName} – ${scheduledDate} ${scheduledTime}. Lemondta: ${cancelledByText}.`,
      html,
    });
    logger.info({ recipientEmail }, "Booking cancelled email sent");
    return true;
  } catch (err) {
    logger.error({ err, recipientEmail }, "Failed to send cancellation email");
    return false;
  }
}

/**
 * Send booking reminder email to the customer (24h before).
 */
export async function sendBookingReminderEmail(params: BookingEmailParams): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const {
    customerEmail,
    customerName,
    businessName,
    serviceName,
    scheduledDate,
    scheduledTime,
    duration,
    totalAmount,
  } = params;
  const dashboardUrl = `${getBaseUrl()}/ugyfel/foglalasaim`;

  const html = buildEmailLayout({
    title: "Emlékeztető: holnapi foglalásod",
    headerColor: "#f59e0b", // amber
    body: `
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Kedves ${customerName},
      </p>
      <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
        Emlékeztetünk, hogy holnap van a foglaládod a <strong>${businessName}</strong> szolgáltatónál.
      </p>
      ${bookingDetailsBlock({ serviceName, scheduledDate, scheduledTime, duration, totalAmount, businessName })}
      <p style="margin:20px 0 0;color:#666;font-size:14px;line-height:1.5;">
        Ha nem tudsz megjelenni, kérjük, mielőbb mondj le a foglalásodat.
      </p>
    `,
    ctaText: "Foglalás megtekintése",
    ctaUrl: dashboardUrl,
  });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Emlékeztető: ${serviceName} – holnap ${scheduledTime} | ${businessName}`,
      text: `Kedves ${customerName}, emlékeztetünk holnapi foglalásodra: ${serviceName} – ${scheduledDate} ${scheduledTime}. ${businessName}`,
      html,
    });
    logger.info({ customerEmail }, "Booking reminder email sent");
    return true;
  } catch (err) {
    logger.error({ err, customerEmail }, "Failed to send reminder email");
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getBaseUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function getInviteUrl(token: string): string {
  return `${getBaseUrl()}/meghivas/${token}`;
}

/** Reusable booking details table block for emails */
function bookingDetailsBlock(params: {
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  totalAmount: string;
  businessName: string;
}): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f9fafb;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;width:140px;">Szolgáltatás:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${params.serviceName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;">Dátum:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${params.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;">Időpont:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${params.scheduledTime}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;">Időtartam:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;">${params.duration} perc</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;">Összeg:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${params.totalAmount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px;">Szolgáltató:</td>
              <td style="padding:6px 0;color:#333;font-size:14px;">${params.businessName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/** Reusable email layout wrapper */
function buildEmailLayout(params: {
  title: string;
  headerColor: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `
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
            <td style="background:${params.headerColor};padding:28px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:6px 14px;margin-bottom:8px;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">Q</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">
                ${params.title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${params.body}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0 8px;">
                    <a href="${params.ctaUrl}" 
                       style="display:inline-block;background-color:#ff5100;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 36px;border-radius:10px;">
                      ${params.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:16px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#999;font-size:12px;">
                &copy; ${new Date().getFullYear()} Qvick. Minden jog fenntartva.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
