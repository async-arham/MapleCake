import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(userId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

/** Returns the user id if the token is genuine and not expired, otherwise null. */
export async function verifySession(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
