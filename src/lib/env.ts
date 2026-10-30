import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),

  // Email (used to send sign-up verification codes). All optional: without SMTP the code is printed in the
  // server terminal during development, and sending fails with a clear log message in production.
  EMAIL_VERIFICATION: z.enum(["on", "off"], "EMAIL_VERIFICATION must be \"on\" or \"off\"").default("on"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
});

let cached: z.infer<typeof schema> | undefined;

/** Validates environment variables on first use and explains clearly what is wrong. */
export function getEnv() {
  if (!cached) {
    const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""));
    const result = schema.safeParse(present);
    if (!result.success) {
      const lines = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid environment variables:\n${lines.join("\n")}`);
    }
    cached = result.data;
  }
  return cached;
}

/**
 * Whether sign-up needs an emailed code. On unless EMAIL_VERIFICATION=off.
 * Reads the variable directly so pages can call it without validating every other variable (builds stay database-free).
 */
export function emailVerificationRequired(): boolean {
  return process.env.EMAIL_VERIFICATION?.trim().toLowerCase() !== "off";
}
