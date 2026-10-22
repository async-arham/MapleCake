import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),
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
