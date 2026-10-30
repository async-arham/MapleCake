import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { CODE_LENGTH } from "./email-code-config";

/** A random 6-digit code from the operating system's secure random source (never Math.random). */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * What goes into the database instead of the code itself.
 * It is tied to the email and to the app secret, so a copy of the table is useless without the secret
 * and a code for one address can never be replayed for another.
 */
export function hashCode(code: string, email: string, secret: string): string {
  return createHmac("sha256", secret).update(`email-code:v1:${email}:${code}`).digest("hex");
}

/** Compares two hashes without leaking, through timing, how many characters matched. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
