import { Resend } from "resend";
import { env } from "@/lib/env";

export const resend = new Resend(env.RESEND_API_KEY || "re_dummy_dev_key");

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.RESEND_API_KEY || env.RESEND_API_KEY === "re_dummy_dev_key") {
    console.log(`\n📧 [DEV EMAIL SIMULATOR] To: ${to} | Subject: ${subject}`);
    console.log(`📧 [HTML Content Preview]:\n${html}\n`);
    return { id: "dev-simulated-email-id", success: true };
  }

  return await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });
}
