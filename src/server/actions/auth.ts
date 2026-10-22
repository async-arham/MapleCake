"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/validation/schemas";
import { authenticate, registerUser } from "../services/auth";
import { formToObject, fromZod, safely } from "./helpers";

async function clientKey(scope: string, email: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${scope}:${ip}:${email}`;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const limit = rateLimit(await clientKey("register", parsed.data.email), 10, 15 * 60_000);
  if (!limit.allowed) return { ok: false, message: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };

  const result = await safely(() => registerUser(parsed.data));
  if (!result.ok) return result.state;
  await createSession(result.value.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
