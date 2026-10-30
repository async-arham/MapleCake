"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState, SendCodeState } from "@/lib/action-state";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { emailVerificationRequired } from "@/lib/env";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema, registerWithCodeSchema, sendCodeSchema } from "@/validation/schemas";
import { authenticate, registerUser, registerWithCode, type RegisterWithCodeResult } from "../services/auth";
import { sendSignupCode } from "../services/email-verification";
import { formToObject, fromZod, safely, withValues } from "./helpers";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

async function clientKey(scope: string, email: string) {
  return `${scope}:${await clientIp()}:${email}`;
}

const FIX_FIELDS = "Please fix the highlighted fields.";

/** Turns "the code is not good" into a message under the code field. */
function codeProblem(outcome: Exclude<RegisterWithCodeResult, { status: "created" }>): ActionState {
  const messages = {
    no_code: "We have not sent a code to this email yet. Click “Send code” first.",
    expired: "That code has expired. Click “Resend” to get a new one.",
    locked: "Too many wrong codes. Click “Resend” to get a new one.",
    wrong: "",
  };
  const message =
    outcome.status === "wrong"
      ? `That code is not right. ${outcome.attemptsLeft} ${outcome.attemptsLeft === 1 ? "try" : "tries"} left.`
      : messages[outcome.status];
  return { ok: false, message: FIX_FIELDS, fieldErrors: { code: message } };
}

function registerLimit(key: string): ActionState | null {
  const limit = rateLimit(key, 10, 15 * 60_000);
  return limit.allowed ? null : { ok: false, message: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };
}

export const registerAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const raw = formToObject(formData);

  if (emailVerificationRequired()) {
    const parsed = registerWithCodeSchema.safeParse(raw);
    if (!parsed.success) return fromZod(parsed.error);
    const blocked = registerLimit(await clientKey("register", parsed.data.email));
    if (blocked) return blocked;

    const result = await safely(() => registerWithCode(parsed.data));
    if (!result.ok) return result.state;
    if (result.value.status !== "created") return codeProblem(result.value);
    await createSession(result.value.user.id);
    redirect("/dashboard");
  }

  // EMAIL_VERIFICATION=off: the original sign-up without a code
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return fromZod(parsed.error);
  const blocked = registerLimit(await clientKey("register", parsed.data.email));
  if (blocked) return blocked;

  const result = await safely(() => registerUser(parsed.data));
  if (!result.ok) return result.state;
  await createSession(result.value.id);
  redirect("/dashboard");
});

/**
 * "Send code" / "Resend" on the sign-up form. Called straight from the browser, so the input is checked like any other.
 * Every outcome is returned as data (nothing is thrown) so the form can show it next to the right field.
 */
export async function sendSignupCodeAction(rawEmail: unknown): Promise<SendCodeState> {
  if (!emailVerificationRequired()) return { ok: false, message: "Email verification is turned off." };

  const parsed = sendCodeSchema.safeParse({ email: rawEmail });
  if (!parsed.success) return { ok: false, emailError: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  const { email } = parsed.data;

  // Stops one visitor from using the form to mail lots of strangers. (Generous: many people can share one office or mobile-network address.)
  const limit = rateLimit(`sendcode:${await clientIp()}`, 20, 15 * 60_000);
  if (!limit.allowed) return { ok: false, message: `Too many requests. Try again in ${limit.retryAfterSeconds} seconds.`, retryAfterSeconds: limit.retryAfterSeconds };

  const result = await safely(() => sendSignupCode(email));
  if (!result.ok) return { ok: false, message: result.state.message };

  const outcome = result.value;
  switch (outcome.status) {
    case "sent":
      return { ok: true, retryAfterSeconds: outcome.retryAfterSeconds, devNote: !outcome.delivered };
    case "email_taken":
      return { ok: false, emailError: "An account with this email already exists. Try signing in." };
    case "cooldown":
      return { ok: false, message: `A code was just sent. You can ask for another in ${outcome.retryAfterSeconds} seconds.`, retryAfterSeconds: outcome.retryAfterSeconds };
    case "too_many": {
      const minutes = Math.ceil(outcome.retryAfterSeconds / 60);
      return { ok: false, message: `Too many codes requested for this email. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`, retryAfterSeconds: outcome.retryAfterSeconds };
    }
  }
}

export const loginAction = withValues(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const key = await clientKey("login", parsed.data.email);
  const limit = rateLimit(key, 8, 15 * 60_000);
  if (!limit.allowed) return { ok: false, message: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };

  const result = await safely(() => authenticate(parsed.data.email, parsed.data.password));
  if (!result.ok) return result.state;
  if (!result.value) return { ok: false, message: "Incorrect email or password." };

  resetRateLimit(key);
  await createSession(result.value.id);
  redirect(safeNext(formData.get("next")) ?? "/dashboard");
});

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
