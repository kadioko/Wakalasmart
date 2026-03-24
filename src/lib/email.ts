export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  console.log([
    `EMAIL TO: ${message.to}`,
    `SUBJECT: ${message.subject}`,
    message.text,
  ].join("\n"));
}

export async function sendInvitationEmail(params: {
  to: string;
  organizationName?: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  const organizationLine = params.organizationName
    ? `You have been invited to join ${params.organizationName}`
    : "You have been invited to join WakalaSmart";

  await sendEmail({
    to: params.to,
    subject: "Your WakalaSmart invitation",
    text: [
      organizationLine,
      `Assigned role: ${params.role}`,
      `Accept invitation: ${params.acceptUrl}`,
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "Reset your WakalaSmart password",
    text: [
      "A password reset was requested for your WakalaSmart account.",
      `Reset password: ${params.resetUrl}`,
    ].join("\n"),
  });
}
