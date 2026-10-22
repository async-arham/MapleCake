import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

let dummy: Promise<string> | undefined;
/** Compared against when the email is unknown, so login takes the same time either way. */
export function dummyHash() {
  dummy ??= bcrypt.hash("not-a-real-password", COST);
  return dummy;
}
