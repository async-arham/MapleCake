import "server-only";
import { db } from "@/lib/db";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/validation/schemas";
import { AppError } from "../errors";

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    // P2002 = "this email is already used". Checked by code so it works in every build mode.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      throw new AppError("CONFLICT", "An account with this email already exists. Try signing in.");
    }
    throw error;
  }
}

/** Returns the user if email and password match, otherwise null. Takes similar time either way. */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  return user && ok ? { id: user.id, email: user.email, name: user.name } : null;
}