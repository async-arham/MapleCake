import "server-only";
import type { EmailCode } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  CODE_TTL_MS,
  MAX_CODE_ATTEMPTS,
  MAX_SENDS_PER_HOUR,
  RESEND_COOLDOWN_MS,
  RESEND_COOLDOWN_SECONDS,
  SEND_WINDOW_MS,
} from "@/lib/auth/email-code-config";
import { generateCode, hashCode, hashesMatch } from "@/lib/auth/email-code";
import { sendEmail } from "../email/send";
import { verificationEmail } from "../email/templates";
import { AppError } from "../errors";

const DAY_MS = 86_400_000;
const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
const errorCode = (error: unknown) => (typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined);

// ---------------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------------

export type SendCodeResult =
  | { status: "sent"; retryAfterSeconds: number; delivered: boolean }
  | { status: "email_taken" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "too_many"; retryAfterSeconds: number };

/**
 * Creates (or replaces) the code for this email and mails it.
 *
 * - Someone who already has an account is told so straight away, instead of after typing a code.
 * - One code per email: asking again replaces the old one, so only the newest email works.
 * - Cooldown (60 s) and an hourly cap (5 codes) are enforced here in the database, so they hold on serverless hosts
 *   and cannot be dodged by opening many tabs. Two clicks in the same instant cannot both send: the second loses the race.
 * - If the email cannot be sent, the database is put back exactly as it was, so a failed send never starts a cooldown.
 */
export async function sendSignupCode(email: string, now = new Date()): Promise<SendCodeResult> {
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return { status: "email_taken" };

  // housekeeping: forget codes that expired more than a day ago (their hourly window is long over)
  await db.emailCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - DAY_MS) } } }).catch(() => undefined);

  const code = generateCode();
  const codeHash = hashCode(code, email, getEnv().AUTH_SECRET);
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  const lost = { status: "cooldown", retryAfterSeconds: RESEND_COOLDOWN_SECONDS } as const;

  const previous = await db.emailCode.findUnique({ where: { email } });
  if (previous) {
    const sinceLast = now.getTime() - previous.lastSentAt.getTime();
    if (sinceLast < RESEND_COOLDOWN_MS) return { status: "cooldown", retryAfterSeconds: seconds(RESEND_COOLDOWN_MS - sinceLast) };

    const windowOpen = now.getTime() - previous.windowStartedAt.getTime() < SEND_WINDOW_MS;
    if (windowOpen && previous.sendCount >= MAX_SENDS_PER_HOUR) {
      return { status: "too_many", retryAfterSeconds: seconds(previous.windowStartedAt.getTime() + SEND_WINDOW_MS - now.getTime()) };
    }
    // Only succeeds if nobody else sent a code since we read the row (lastSentAt is our version number).
    const claimed = await db.emailCode.updateMany({
      where: { id: previous.id, lastSentAt: previous.lastSentAt },
      data: {
        codeHash,
        attempts: 0,
        expiresAt,
        lastSentAt: now,
        sendCount: windowOpen ? previous.sendCount + 1 : 1,
        windowStartedAt: windowOpen ? previous.windowStartedAt : now,
      },
    });
    if (claimed.count === 0) return lost;
  } else {
    try {
      await db.emailCode.create({ data: { email, codeHash, expiresAt, lastSentAt: now, windowStartedAt: now, sendCount: 1 } });
    } catch (error) {
      if (errorCode(error) === "P2002") return lost; // another request created the row first
      throw error;
    }
  }

  try {
    const { delivered } = await sendEmail(verificationEmail(email, code));
    return { status: "sent", retryAfterSeconds: RESEND_COOLDOWN_SECONDS, delivered };
  } catch (error) {
    console.error("Could not send the verification email:", error);
    await restore(email, codeHash, previous);
    throw new AppError("UNAVAILABLE", "We could not send the email. Check the address and try again in a moment.");
  }
}

/** Puts the row back the way it was before a send attempt that failed. */
async function restore(email: string, newHash: string, previous: EmailCode | null) {
  try {
    if (previous) {
      await db.emailCode.updateMany({
        where: { id: previous.id, codeHash: newHash },
        data: {
          codeHash: previous.codeHash,
          attempts: previous.attempts,
          expiresAt: previous.expiresAt,
          lastSentAt: previous.lastSentAt,
          sendCount: previous.sendCount,
          windowStartedAt: previous.windowStartedAt,
        },
      });
    } else {
      await db.emailCode.deleteMany({ where: { email, codeHash: newHash } });
    }
  } catch (error) {
    console.error("Could not undo a failed code send:", error);
  }
}

// ---------------------------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------------------------

export type CodeProblem =
  | { status: "no_code" } // nothing was requested for this email (or the code was already used)
  | { status: "expired" }
  | { status: "locked" } // too many wrong guesses
  | { status: "wrong"; attemptsLeft: number };

export type VerifyResult = { status: "ok"; codeId: string; codeHash: string } | CodeProblem;

/**
 * Checks a code WITHOUT using it up. Using it up happens in the same transaction that creates the account.
 *
 * Every guess is counted in the database before it is compared, so many requests in parallel
 * cannot squeeze in more than MAX_CODE_ATTEMPTS guesses.
 */
export async function verifySignupCode(email: string, code: string, now = new Date()): Promise<VerifyResult> {
  const row = await db.emailCode.findUnique({ where: { email }, select: { id: true, expiresAt: true } });
  if (!row) return { status: "no_code" };
  if (row.expiresAt.getTime() <= now.getTime()) return { status: "expired" };

  let counted: { attempts: number; codeHash: string; expiresAt: Date };
  try {
    counted = await db.emailCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true, codeHash: true, expiresAt: true },
    });
  } catch (error) {
    if (errorCode(error) === "P2025") return { status: "no_code" }; // used by another request a moment ago
    throw error;
  }
  // from here on only the freshly read values count (a resend may have replaced the code since the first read)
  if (counted.expiresAt.getTime() <= now.getTime()) return { status: "expired" };
  if (counted.attempts > MAX_CODE_ATTEMPTS) return { status: "locked" };

  if (!hashesMatch(hashCode(code, email, getEnv().AUTH_SECRET), counted.codeHash)) {
    const attemptsLeft = MAX_CODE_ATTEMPTS - counted.attempts;
    return attemptsLeft > 0 ? { status: "wrong", attemptsLeft } : { status: "locked" };
  }
  return { status: "ok", codeId: row.id, codeHash: counted.codeHash };
}
