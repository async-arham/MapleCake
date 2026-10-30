import "server-only";
import { db } from "@/lib/db";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RegisterInput, RegisterWithCodeInput } from "@/validation/schemas";
import { AppError } from "../errors";
import { verifySignupCode, type CodeProblem } from "./email-verification";

const EMAIL_TAKEN = "An account with this email already exists. Try signing in.";
const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    // P2002 = "this email is already used". Checked by code so it works in every build mode.
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", EMAIL_TAKEN);
    throw error;
  }
}

export type RegisterWithCodeResult = { status: "created"; user: { id: string; email: string; name: string } } | CodeProblem;

/**
 * Creates the account only if the emailed code is right.
 * The code is used up in the same transaction that creates the user, so:
 * - the same code can never create two accounts, even with two requests at the same instant;
 * - if creating the user fails (for example the email was taken a second ago) the code is NOT used up.
 */
export async function registerWithCode(input: RegisterWithCodeInput): Promise<RegisterWithCodeResult> {
  const checked = await verifySignupCode(input.email, input.code);
  if (checked.status !== "ok") return checked;

  const passwordHash = await hashPassword(input.password); // slow on purpose, so keep it outside the transaction
  try {
    const user = await db.$transaction(async (tx) => {
      const used = await tx.emailCode.deleteMany({ where: { id: checked.codeId, codeHash: checked.codeHash } });
      if (used.count !== 1) return null; // another request used (or replaced) this code a moment ago
      return tx.user.create({
        data: { name: input.name, email: input.email, passwordHash },
        select: { id: true, email: true, name: true },
      });
    });
    return user ? { status: "created", user } : { status: "no_code" };
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", EMAIL_TAKEN);
    throw error;
  }
}

/** Returns the user if email and password match, otherwise null. Takes similar time either way. */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  return user && ok ? { id: user.id, email: user.email, name: user.name } : null;
}