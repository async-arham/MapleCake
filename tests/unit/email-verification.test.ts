import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the database. It copies the parts of Prisma that matter here:
// unique-email errors (P2002), "row not found" errors (P2025), conditional updates, and transaction rollback.
const h = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: string };
  const users: Row[] = [];
  const codes: Row[] = [];
  const outbox: { to: string; text: string }[] = [];
  const control = { failSending: false, userCreateFails: false };
  let counter = 0;

  const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, want]) => {
      const have = row[key];
      if (want && typeof want === "object" && !(want instanceof Date) && "lt" in want) return (have as Date).getTime() < ((want as { lt: Date }).lt as Date).getTime();
      return same(have, want);
    });
  const fail = (code: string) => Object.assign(new Error(code), { code });

  const db = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => users.find((u) => u.email === where.email) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (control.userCreateFails || users.some((u) => u.email === data.email)) throw fail("P2002");
        const row = { id: `u${++counter}`, ...data } as Row;
        users.push(row);
        return { id: row.id, email: row.email, name: row.name };
      },
    },
    emailCode: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        const row = codes.find((c) => c.email === where.email);
        return row ? { ...row } : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (codes.some((c) => c.email === data.email)) throw fail("P2002");
        codes.push({ id: `c${++counter}`, attempts: 0, ...data } as Row);
      },
      update: async ({ where, data }: { where: { id: string }; data: { attempts: { increment: number } } }) => {
        const row = codes.find((c) => c.id === where.id);
        if (!row) throw fail("P2025");
        row.attempts = (row.attempts as number) + data.attempts.increment;
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hits = codes.filter((c) => matches(c, where));
        hits.forEach((c) => Object.assign(c, data));
        return { count: hits.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        let count = 0;
        for (let i = codes.length - 1; i >= 0; i--) if (matches(codes[i] as Row, where)) (codes.splice(i, 1), count++);
        return { count };
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const before = { users: users.map((r) => ({ ...r })), codes: codes.map((r) => ({ ...r })) };
      try {
        return await fn(db);
      } catch (error) {
        users.splice(0, users.length, ...before.users);
        codes.splice(0, codes.length, ...before.codes);
        throw error;
      }
    },
  };
  return { db, users, codes, outbox, control };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ AUTH_SECRET: "s".repeat(32) }) }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: async (p: string) => `hash(${p})` }));
vi.mock("@/server/email/send", () => ({
  sendEmail: async (mail: { to: string; text: string }) => {
    if (h.control.failSending) throw new Error("SMTP down");
    h.outbox.push({ to: mail.to, text: mail.text });
    return { delivered: true };
  },
}));

import { registerWithCode } from "../../src/server/services/auth";
import { sendSignupCode, verifySignupCode } from "../../src/server/services/email-verification";

const EMAIL = "new@person.com";
const T0 = new Date("2026-10-30T10:00:00Z");
const after = (seconds: number) => new Date(T0.getTime() + seconds * 1000);
const lastCode = () => /: (\d{6})/.exec(h.outbox.at(-1)?.text ?? "")?.[1] ?? "";
const input = (code: string, email = EMAIL) => ({ name: "New Person", email, password: "abcdefghi1", code });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); // "now" inside registerWithCode is the real clock; pin it to T0
  vi.setSystemTime(T0);
  h.users.length = 0;
  h.codes.length = 0;
  h.outbox.length = 0;
  h.control.failSending = false;
  h.control.userCreateFails = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.useRealTimers());

describe("sending a code", () => {
  it("mails a 6-digit code and stores only its hash", async () => {
    const result = await sendSignupCode(EMAIL, T0);
    expect(result).toMatchObject({ status: "sent", retryAfterSeconds: 60 });
    expect(h.outbox).toHaveLength(1);
    expect(lastCode()).toMatch(/^\d{6}$/);
    expect(JSON.stringify(h.codes)).not.toContain(lastCode());
  });

  it("refuses an address that already has an account, and sends nothing", async () => {
    h.users.push({ id: "u0", email: EMAIL, name: "Old" });
    expect(await sendSignupCode(EMAIL, T0)).toEqual({ status: "email_taken" });
    expect(h.outbox).toHaveLength(0);
  });

  it("makes people wait 60 seconds between codes, and says how long", async () => {
    await sendSignupCode(EMAIL, T0);
    const first = lastCode();
    expect(await sendSignupCode(EMAIL, after(20))).toEqual({ status: "cooldown", retryAfterSeconds: 40 });
    expect(h.outbox).toHaveLength(1);
    expect((await verifySignupCode(EMAIL, first, after(21))).status).toBe("ok"); // the first code still works
  });

  it("a resend replaces the old code: only the newest email works", async () => {
    await sendSignupCode(EMAIL, T0);
    const old = lastCode();
    expect((await sendSignupCode(EMAIL, after(61))).status).toBe("sent");
    const fresh = lastCode();
    if (old !== fresh) expect((await verifySignupCode(EMAIL, old, after(62))).status).toBe("wrong");
    expect((await verifySignupCode(EMAIL, fresh, after(63))).status).toBe("ok");
  });

  it("allows 5 codes an hour, then asks to wait, then resets", async () => {
    for (let i = 0; i < 5; i++) expect((await sendSignupCode(EMAIL, after(i * 61))).status).toBe("sent");
    const blocked = await sendSignupCode(EMAIL, after(5 * 61));
    expect(blocked.status).toBe("too_many");
    expect(h.outbox).toHaveLength(5);
    expect((await sendSignupCode(EMAIL, after(3601))).status).toBe("sent");
  });

  it("two clicks in the same instant send only one email", async () => {
    const [a, b] = await Promise.all([sendSignupCode(EMAIL, T0), sendSignupCode(EMAIL, T0)]);
    expect([a.status, b.status].sort()).toEqual(["cooldown", "sent"]);
    expect(h.outbox).toHaveLength(1);
  });

  it("two resends in the same instant send only one email", async () => {
    await sendSignupCode(EMAIL, T0);
    const [a, b] = await Promise.all([sendSignupCode(EMAIL, after(61)), sendSignupCode(EMAIL, after(61))]);
    expect([a.status, b.status].sort()).toEqual(["cooldown", "sent"]);
    expect(h.outbox).toHaveLength(2);
    expect((await verifySignupCode(EMAIL, lastCode(), after(62))).status).toBe("ok"); // the code that was mailed is the one that works
  });

  it("a failed send leaves nothing behind and starts no cooldown", async () => {
    h.control.failSending = true;
    await expect(sendSignupCode(EMAIL, T0)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(h.codes).toHaveLength(0);
    h.control.failSending = false;
    expect((await sendSignupCode(EMAIL, after(1))).status).toBe("sent");
  });

  it("a failed resend keeps the earlier code working", async () => {
    await sendSignupCode(EMAIL, T0);
    const first = lastCode();
    h.control.failSending = true;
    await expect(sendSignupCode(EMAIL, after(61))).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect((await verifySignupCode(EMAIL, first, after(62))).status).toBe("ok");
  });

  it("forgets codes that expired more than a day ago", async () => {
    await sendSignupCode("old@person.com", T0);
    await sendSignupCode(EMAIL, after(2 * 86_400));
    expect(h.codes.map((c) => c.email)).toEqual([EMAIL]);
  });
});

describe("checking a code", () => {
  it("says so when no code was ever requested for this address", async () => {
    expect((await verifySignupCode(EMAIL, "123456", T0)).status).toBe("no_code");
  });

  it("a code for one address does not work for another", async () => {
    await sendSignupCode(EMAIL, T0);
    expect((await verifySignupCode("other@person.com", lastCode(), after(1))).status).toBe("no_code");
  });

  it("expires after 10 minutes", async () => {
    await sendSignupCode(EMAIL, T0);
    const code = lastCode();
    expect((await verifySignupCode(EMAIL, code, after(599))).status).toBe("ok");
    expect((await verifySignupCode(EMAIL, code, after(601))).status).toBe("expired");
  });

  it("counts down wrong guesses, then locks even the right code", async () => {
    await sendSignupCode(EMAIL, T0);
    const right = lastCode();
    const wrong = right === "000000" ? "111111" : "000000";
    const seen: unknown[] = [];
    for (let i = 0; i < 5; i++) seen.push(await verifySignupCode(EMAIL, wrong, after(1)));
    expect(seen).toEqual([
      { status: "wrong", attemptsLeft: 4 },
      { status: "wrong", attemptsLeft: 3 },
      { status: "wrong", attemptsLeft: 2 },
      { status: "wrong", attemptsLeft: 1 },
      { status: "locked" },
    ]);
    expect((await verifySignupCode(EMAIL, right, after(2))).status).toBe("locked");
    await sendSignupCode(EMAIL, after(61)); // a fresh code starts clean
    expect((await verifySignupCode(EMAIL, lastCode(), after(62))).status).toBe("ok");
  });

  it("many guesses at once cannot get more than 5 tries", async () => {
    await sendSignupCode(EMAIL, T0);
    const right = lastCode();
    const wrong = right === "000000" ? "111111" : "000000";
    const results = await Promise.all(Array.from({ length: 30 }, () => verifySignupCode(EMAIL, wrong, after(1))));
    expect(results.filter((r) => r.status === "wrong")).toHaveLength(4);
    expect(results.filter((r) => r.status === "locked")).toHaveLength(26);
    expect((await verifySignupCode(EMAIL, right, after(2))).status).toBe("locked");
  });
});

describe("creating the account", () => {
  it("creates the user and uses up the code", async () => {
    await sendSignupCode(EMAIL, T0);
    const result = await registerWithCode(input(lastCode()));
    expect(result.status).toBe("created");
    expect(h.users).toHaveLength(1);
    expect(h.users[0]).toMatchObject({ email: EMAIL, passwordHash: "hash(abcdefghi1)" });
    expect(h.codes).toHaveLength(0);
  });

  it("a code can only be used once", async () => {
    await sendSignupCode(EMAIL, T0);
    const code = lastCode();
    expect((await registerWithCode(input(code))).status).toBe("created");
    expect((await registerWithCode(input(code))).status).toBe("no_code");
    expect(h.users).toHaveLength(1);
  });

  it("two sign-ups with the same code at the same instant create one account", async () => {
    await sendSignupCode(EMAIL, T0);
    const code = lastCode();
    const results = await Promise.all([registerWithCode(input(code)), registerWithCode(input(code))]);
    expect(results.map((r) => r.status).sort()).toEqual(["created", "no_code"]);
    expect(h.users).toHaveLength(1);
  });

  it("a wrong code creates nothing", async () => {
    await sendSignupCode(EMAIL, T0);
    const wrong = lastCode() === "000000" ? "111111" : "000000";
    expect(await registerWithCode(input(wrong))).toMatchObject({ status: "wrong" });
    expect(h.users).toHaveLength(0);
  });

  it("if the email got taken meanwhile, says so and does not use up the code", async () => {
    await sendSignupCode(EMAIL, T0);
    h.control.userCreateFails = true;
    await expect(registerWithCode(input(lastCode()))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(h.codes).toHaveLength(1);
  });
});
