import { describe, expect, it } from "vitest";
import { addMemberSchema, loginSchema, projectListSchema, projectSchema, registerSchema, taskListSchema, taskSchema } from "@/validation/schemas";
import { parseDateOnly, toDateInput } from "@/lib/dates";
import { buildPoolConfig } from "@/lib/pool-config";
import { rateLimit } from "@/lib/rate-limit";

const validTask = { title: "Fix login", description: "", status: "TODO", priority: "HIGH", type: "BUG", dueDate: "", assigneeId: "" };

describe("auth schemas", () => {
  it("normalises email and accepts a good password", () => {
    const r = registerSchema.parse({ name: " Ada Lovelace ", email: " ADA@Example.COM ", password: "correct horse 9" });
    expect(r).toEqual({ name: "Yaqoob Aziz", email: "ada@example.com", password: "correct horse 9" });
  });
  it("rejects weak passwords and bad emails", () => {
    expect(registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "onlyletterslong" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "1234567890123" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ada", email: "not-an-email", password: "correct horse 9" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("rejects passwords over bcrypt's 72 byte limit", () => {
    expect(registerSchema.safeParse({ name: "Ada", email: "a@b.co", password: "a1".repeat(40) }).success).toBe(false);
  });
});

describe("project and task schemas", () => {
  it("turns blank optional fields into null", () => {
    expect(projectSchema.parse({ name: "Apollo", description: "  " }).description).toBeNull();
    const t = taskSchema.parse(validTask);
    expect(t.description).toBeNull();
    expect(t.dueDate).toBeNull();
    expect(t.assigneeId).toBeNull();
  });
  it("parses due dates and rejects impossible ones", () => {
    expect(taskSchema.parse({ ...validTask, dueDate: "2026-11-05" }).dueDate?.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(taskSchema.safeParse({ ...validTask, dueDate: "2026-02-30" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, dueDate: "tomorrow" }).success).toBe(false);
  });
  it("rejects unknown enum values and short titles", () => {
    expect(taskSchema.safeParse({ ...validTask, status: "DOING" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, priority: "URGENT" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, title: "a" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, title: "x".repeat(201) }).success).toBe(false);
  });
  it("never allows granting the Owner role", () => {
    expect(addMemberSchema.safeParse({ projectId: "p1", email: "a@b.co", role: "OWNER" }).success).toBe(false);
    expect(addMemberSchema.safeParse({ projectId: "p1", email: "a@b.co", role: "MEMBER" }).success).toBe(true);
  });
});

describe("list query schemas fall back to safe defaults", () => {
  it("handles garbage input for projects", () => {
    expect(projectListSchema.parse({ page: "-3", sort: "drop table", status: "zzz", q: "x" })).toEqual({ q: "x", status: "active", sort: "updated", page: 1 });
  });
  it("handles garbage input for tasks", () => {
    const q = taskListSchema.parse({ page: "abc", sort: "nope", dir: "sideways", status: "BAD", overdue: "yes" });
    expect(q).toMatchObject({ page: 1, sort: "due", dir: "asc", status: "ALL", overdue: "0" });
  });
});

describe("date helpers", () => {
  it("round-trips real dates only", () => {
    expect(parseDateOnly("2026-10-22")).not.toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("2026-02-29")).toBeNull();
    expect(toDateInput(parseDateOnly("2026-10-22"))).toBe("2026-10-22");
  });
});

describe("database pool config", () => {
  it("uses TLS for remote hosts and strips Prisma-only options", () => {
    const c = buildPoolConfig("postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require", true);
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
    expect(c.connectionString).not.toMatch(/pgbouncer|sslmode/);
    expect(c.max).toBe(1);
  });
  it("skips TLS for localhost", () => {
    expect(buildPoolConfig("postgresql://u:p@localhost:5432/db").ssl).toBeUndefined();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const key = `t-${Math.random()}`;
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit(key, 3, 1000, t0).allowed)).toEqual([true, true, true]);
    expect(rateLimit(key, 3, 1000, t0 + 10).allowed).toBe(false);
    expect(rateLimit(key, 3, 1000, t0 + 1500).allowed).toBe(true);
  });
});
