import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";

export type Mail = { to: string; subject: string; text: string; html: string };

const globalForMail = globalThis as unknown as { __sbMailer?: { key: string; transporter: Transporter } };

function transporterFor(env: ReturnType<typeof getEnv>): Transporter {
  const host = env.SMTP_HOST as string;
  // Google shows app passwords as "abcd efgh ijkl mnop". The spaces are for reading only.
  const pass = host.endsWith("gmail.com") ? (env.SMTP_PASS as string).replace(/\s+/g, "") : (env.SMTP_PASS as string);
  const key = `${host}:${env.SMTP_PORT}:${env.SMTP_USER}:${pass}`;
  if (globalForMail.__sbMailer?.key !== key) {
    globalForMail.__sbMailer = {
      key,
      transporter: nodemailer.createTransport({
        host,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // 465 = TLS from the start, 587 = upgraded with STARTTLS
        requireTLS: env.SMTP_PORT !== 465,
        auth: { user: env.SMTP_USER, pass },
        // never leave a visitor staring at a spinner because a mail server is slow
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      }),
    };
  }
  return globalForMail.__sbMailer.transporter;
}

/**
 * Sends one email. Returns `delivered: false` only in development when SMTP is not set up
 * (the message is printed in the server terminal instead). Throws if sending fails.
 */
export async function sendEmail(mail: Mail): Promise<{ delivered: boolean }> {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS.");
    }
    console.info(`\n[email] SMTP is not configured, so nothing was sent. In production this would be emailed:\n  To:      ${mail.to}\n  Subject: ${mail.subject}\n\n${mail.text}\n`);
    return { delivered: false };
  }
  await transporterFor(env).sendMail({
    from: env.EMAIL_FROM ?? `Maplecake <${env.SMTP_USER}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return { delivered: true };
}
