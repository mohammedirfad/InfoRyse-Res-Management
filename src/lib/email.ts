import nodemailer from "nodemailer";
import { Resend } from "resend";

const smtpUser = process.env.SMTP_USER || "testerqa852@gmail.com";
const smtpPass = process.env.SMTP_PASS || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Default From address requested: testerqa852@gmail.com
export const DEFAULT_FROM = process.env.EMAIL_FROM || `InfoRyse Operating System <${smtpUser}>`;

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Sends real email to the recipient's inbox using Gmail SMTP (testerqa852@gmail.com)
 * or Resend. If no credentials are provided in .env, prints rich diagnostic logs.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const plainText = text || htmlToPlainText(html);

    // 1. Primary: Gmail SMTP transport (required for sending directly from testerqa852@gmail.com)
    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""), // strip any spaces in Google App Passwords
        },
      });

      const info = await transporter.sendMail({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
        text: plainText,
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "high",
          "Auto-Submitted": "auto-generated",
          "X-Auto-Response-Suppress": "All",
        },
      });

      console.log(`\n✅ [Email:Gmail SMTP] REAL EMAIL DISPATCHED TO INBOX!`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   From:       ${DEFAULT_FROM}`);
      console.log(`   To:         ${to}`);
      console.log(`   Subject:    ${subject}\n`);

      return { success: true };
    }

    // 2. Secondary: Resend (if configured with custom domain)
    if (resend) {
      const response = await resend.emails.send({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
        text: text || subject,
      });
      if (response.error) {
        console.error("[Email:Resend] Error sending email:", response.error);
        return { success: false, error: response.error.message };
      }
      console.log(`[Email:Resend] Dispatched successfully to ${to} (${subject})`);
      return { success: true };
    }

    // 3. Fallback: Log why the real email was not delivered and print simulated details
    console.warn("\n⚠️ ─────────────────────────────────────────────────────────────");
    console.warn("⚠️ [EMAIL NOT SENT TO REAL INBOX - MISSING GMAIL APP PASSWORD]");
    console.warn(`   Sender:  ${DEFAULT_FROM}`);
    console.warn(`   To:      ${to}`);
    console.warn(`   Subject: ${subject}`);
    console.warn("   REASON:  SMTP_PASS is not configured in .env.");
    console.warn("   FIX:     To send real emails from testerqa852@gmail.com to real inboxes:");
    console.warn("            1. Go to Google Account Security: https://myaccount.google.com/apppasswords");
    console.warn("            2. Generate a 16-character App Password for 'Mail'.");
    console.warn("            3. Put SMTP_PASS=\"xxxx xxxx xxxx xxxx\" in your .env file.");
    console.warn("─────────────────────────────────────────────────────────────\n");

    return {
      success: false,
      error: "SMTP_PASS not configured in .env. Real email delivery requires a Gmail App Password.",
    };
  } catch (err: any) {
    console.error("[Email] Send exception:", err);
    return { success: false, error: err?.message || "Failed to deliver email" };
  }
}

/**
 * Generates an onboarding email with the shared admin URL and password-reset instructions.
 */
export function buildOnboardingEmailHtml({
  restaurantName,
  ownerName,
  ownerEmail,
  loginUrl,
  slug,
}: {
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  loginUrl: string;
  slug: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to InfoRyse</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b111e; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0b1736 0%, #172554 50%, #1e3a8a 100%); padding: 40px 32px; text-align: center; color: #ffffff; position: relative; }
    .badge { display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; color: #93c5fd; }
    .brand-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 6px 0; color: #ffffff; }
    .brand-sub { font-size: 14px; color: #94a3b8; margin: 0; font-weight: 400; }
    .content { padding: 36px 32px; }
    .salutation { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .lead-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    
    /* Credentials Card */
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 28px; }
    .card-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0; }
    
    /* Security Warning */
    .security-notice { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 28px; }
    .security-notice h4 { margin: 0 0 6px 0; font-size: 14px; color: #92400e; font-weight: 700; }
    .security-notice p { margin: 0; font-size: 13px; line-height: 1.5; color: #b45309; }

    /* CTA Button */
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #1e3a8a; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 36px; border-radius: 14px; box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3); }
    
    /* Features Grid */
    .features-section { border-top: 1px solid #f1f5f9; padding-top: 24px; margin-top: 24px; }
    .features-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
    .feature-item { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 8px; }
    
    /* Footer */
    .footer { background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">Enterprise Partner Onboarding</div>
      <h1 class="brand-title">InfoRyse Operating System</h1>
      <p class="brand-sub">Smart QR Ordering · Kitchen Display System · Real-time Billing</p>
    </div>
    <div class="content">
      <h2 class="salutation">Welcome, ${ownerName || "Partner"}! 👋</h2>
      <p class="lead-text">
        Your restaurant <strong>${restaurantName}</strong> has been registered on the <strong>InfoRyse POS & Operations Platform</strong>. Use the secure password reset flow to set your account password.
      </p>

      <div class="card">
        <h3 class="card-title">🔐 Administrative Access Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Restaurant Portal:</td>
            <td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">${restaurantName} (/${slug})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Login Email:</td>
            <td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${ownerEmail}</td>
          </tr>
        </table>
      </div>

      <div class="security-notice">
        <h4>🔒 Mandatory Security Action Required</h4>
        <p>
          No password is included in this email. Open the portal and choose <strong>Forgot password</strong> to verify your email and set a password securely.
        </p>
      </div>

      <div class="cta-container">
        <a href="${loginUrl}" target="_blank" class="cta-btn">
          Sign In to Restaurant Admin Panel →
        </a>
      </div>

      <div class="features-section">
        <div class="features-title">What's Next for ${restaurantName}:</div>
        <div class="feature-item">✓ <strong>Digital Menu:</strong> Setup categories, dishes, modifiers, and high-resolution food images.</div>
        <div class="feature-item">✓ <strong>Tables & Smart QR:</strong> Generate high-resolution printable QR cards for your dining tables.</div>
        <div class="feature-item">✓ <strong>Kitchen Display (KDS):</strong> Monitor real-time incoming orders with automated audio notifications.</div>
        <div class="feature-item">✓ <strong>Live Table Billing:</strong> Settle bills with instant UPI, cash, and thermal receipt printing.</div>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">From: ${smtpUser} · InfoRyse Technologies Ltd.</p>
      <p style="margin: 0;">Need assistance? Contact our 24/7 Priority Operations Desk at <a href="mailto:support@inforyse.com">support@inforyse.com</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates an executive broadcast / direct message email from Super Admin to Restaurant Owner.
 */
export function buildBroadcastEmailHtml({
  restaurantName,
  ownerName,
  subject,
  message,
  category = "Important Notice",
}: {
  restaurantName: string;
  ownerName: string;
  subject: string;
  message: string;
  category?: string;
}): string {
  const formattedMessage = message
    .split("\n\n")
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">${p.replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b111e;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0b1736 0%, #1e293b 100%); padding: 36px 32px; color: #ffffff;">
      <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 9999px; padding: 3px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; color: #38bdf8;">
        ${category}
      </div>
      <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #ffffff;">InfoRyse Super Administration</h1>
      <p style="font-size: 13px; color: #94a3b8; margin: 0;">Official communication for <strong>${restaurantName}</strong></p>
    </div>
    <div style="padding: 36px 32px;">
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Dear ${ownerName || "Restaurant Partner"},
      </p>
      
      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0; font-size: 15px; color: #0369a1; font-weight: 700;">${subject}</h4>
      </div>

      <div style="margin-bottom: 28px;">
        ${formattedMessage}
      </div>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; font-size: 12px; color: #64748b; line-height: 1.5;">
        This message was sent from ${smtpUser} directly by the InfoRyse Platform Super Administrator to the registered owner of <strong>${restaurantName}</strong>.
      </div>
    </div>
    <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      © ${new Date().getFullYear()} InfoRyse Technologies Ltd. · Operations & Infrastructure
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates a verification code email for two-factor login.
 */
export function buildOtpEmailHtml({ code }: { code: string }): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f1f5f9; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; text-align: center;">
    <h2 style="color: #0f172a; margin-top: 0;">Your Verification Code</h2>
    <p style="color: #64748b; font-size: 14px;">Use the 6-digit code below to complete your administrative login:</p>
    <div style="font-size: 32px; font-weight: 800; letter-spacing: 0.2em; font-family: monospace; color: #1e3a8a; background: #e0f2fe; padding: 16px 24px; border-radius: 12px; display: inline-block; margin: 20px 0;">
      ${code}
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">This code expires in 5 minutes. Never share this code with anyone.</p>
  </div>
</body>
</html>`;
}

/**
 * Generates an executive password reset code email for Restaurant Owners & Staff.
 */
export function buildPasswordResetEmailHtml({ code, email }: { code: string; email?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your InfoRyse Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1a14;">
  <div style="max-width: 520px; margin: 36px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #132A1E 0%, #1F4733 100%); padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 48px; height: 48px; border-radius: 14px; background: rgba(212, 169, 76, 0.15); border: 1px solid rgba(212, 169, 76, 0.3); margin-bottom: 12px; line-height: 48px; font-size: 22px;">
        🔐
      </div>
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.02em;">
        Info<span style="color: #D4A94C;">Ryse</span> Password Reset
      </h1>
      <p style="color: #a7f3d0; font-size: 13px; margin: 0;">Official security request for your restaurant partner account</p>
    </div>

    <div style="padding: 32px 28px; text-align: center;">
      <p style="font-size: 15px; color: #334155; margin: 0 0 8px 0;">
        We received a request to reset the password for <strong>${email || "your account"}</strong>.
      </p>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 24px 0;">
        Enter the 6-digit verification code below to authorize setting a new password:
      </p>

      <div style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.3em; color: #065f46;">
          ${code}
        </span>
      </div>

      <div style="background: #f8fafc; border-radius: 12px; padding: 14px 18px; text-align: left; font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">
        🔒 <strong>Security Warning:</strong> This code is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email — your existing password remains unchanged.
      </div>
    </div>

    <div style="background: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      © ${new Date().getFullYear()} InfoRyse Technologies Ltd. · Secured Restaurant Operating System
    </div>
  </div>
</body>
</html>`;
}
