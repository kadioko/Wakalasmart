import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "WakalaSmart <noreply@wakalasmart.co.tz>";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  // In development or if no API key, log to console
  if (!resend) {
    console.log("📧 EMAIL (dev mode - no RESEND_API_KEY):");
    console.log(`   TO: ${message.to}`);
    console.log(`   SUBJECT: ${message.subject}`);
    console.log(`   BODY: ${message.text}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Email send failed: ${error.message}`);
    }
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  BRANCH_MANAGER: "Branch Manager",
  CASHIER: "Cashier",
  ACCOUNTANT: "Accountant",
  SUPER_ADMIN: "Super Admin",
};

export async function sendInvitationEmail(params: {
  to: string;
  organizationName?: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  const orgName = params.organizationName || "WakalaSmart";
  const roleLabel = ROLE_LABELS[params.role] || params.role;

  const text = [
    `You have been invited to join ${orgName} on WakalaSmart.`,
    "",
    `Role: ${roleLabel}`,
    "",
    `Click the link below to accept your invitation:`,
    params.acceptUrl,
    "",
    "This invitation expires in 7 days.",
    "",
    "If you did not expect this invitation, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">You're Invited!</h2>
      <p>You have been invited to join <strong>${orgName}</strong> on WakalaSmart.</p>
      <p><strong>Role:</strong> ${roleLabel}</p>
      <div style="margin: 24px 0;">
        <a href="${params.acceptUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: `You're invited to join ${orgName} on WakalaSmart`,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  const text = [
    "A password reset was requested for your WakalaSmart account.",
    "",
    "Click the link below to reset your password:",
    params.resetUrl,
    "",
    "This link expires in 1 hour.",
    "",
    "If you did not request this reset, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Reset Your Password</h2>
      <p>A password reset was requested for your WakalaSmart account.</p>
      <div style="margin: 24px 0;">
        <a href="${params.resetUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        If you did not request this reset, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: "Reset your WakalaSmart password",
    text,
    html,
  });
}
