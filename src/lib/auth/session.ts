import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./token";

export async function createSession(userId: string) {
  const token = await signSession(userId, getEnv().AUTH_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, or null. The user is re-read from the database on every request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySession(token, getEnv().AUTH_SECRET);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
