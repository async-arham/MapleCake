import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const SEC = 1000;
const DAY = 86_400_000;

describe.skipIf(!enabled)("live updates feed (real database)", () => {
  let db: typeof import("@/lib/db").db;
  let live: typeof import("@/server/queries/live");
  let a: { id: string }, b: { id: string };
  let projectId: string;

  const make = (userId: string, over: Record<string, unknown> = {}) =>
    db.notification.create({ data: { userId, type: "TASK_ASSIGNED", message: "hello", ...over } });

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    live = await import("@/server/queries/live");
    await db.$executeRawUnsafe(`TRUNCATE "User", "Project", "ProjectMember", "Task", "ActivityLog", "Notification", "ProjectInvite" CASCADE`);
    const mk = (n: string) => db.user.create({ data: { name: n, email: `${n.toLowerCase()}@l.dev`, passwordHash: "x" } });
    [a, b] = (await Promise.all([mk("Lia"), mk("Lou")])) as [{ id: string }, { id: string }];
    projectId = (await db.project.create({ data: { name: "L", ownerId: a.id, members: { create: [{ userId: a.id, role: "OWNER" }, { userId: b.id, role: "MEMBER" }] } } })).id;
  });
  afterAll(async () => db?.$disconnect());

  it("starts from nothing for a brand-new person", async () => {
    const boot = await live.getLiveBootstrap(a.id);
    expect(boot).toMatchObject({ unread: 0, invites: 0, seen: [] });
    expect((await live.getLiveSnapshot(a.id, new Date(boot.cursor))).toasts).toHaveLength(0);
  });

  it("delivers a new notification once, and never re-announces old ones", async () => {
    const old = await make(a.id, { message: "old" });
    const boot = await live.getLiveBootstrap(a.id);
    expect(boot.seen).toContain(old.id); // the page already shows it, so it must not pop up
    const fresh = await make(a.id, { message: "fresh", createdAt: new Date(Date.now() + 2 * SEC) });
    const snap = await live.getLiveSnapshot(a.id, new Date(boot.cursor));
    expect(snap.toasts.map((t) => t.id)).toContain(fresh.id);
    expect(snap.unread).toBe(2);
    expect(new Date(snap.cursor).getTime()).toBeGreaterThan(new Date(boot.cursor).getTime());
    const again = await live.getLiveSnapshot(a.id, new Date(snap.cursor));
    expect(again.toasts.every((t) => t.id === fresh.id || t.id === old.id)).toBe(true); // overlap repeats are filtered by the browser's seen-list
  });

  it("does not lose a notification that was saved a moment late (out of order)", async () => {
    const cursor = new Date(Date.now() + 60 * SEC);
    const late = await make(a.id, { message: "late", createdAt: new Date(cursor.getTime() - 3 * SEC) });
    expect((await live.getLiveSnapshot(a.id, cursor)).toasts.map((t) => t.id)).toContain(late.id);
  });

  it("ignores read, dismissed and expired notifications", async () => {
    await db.notification.deleteMany({ where: { userId: b.id } });
    const cursor = new Date(Date.now() - SEC);
    const read = await make(b.id, { readAt: new Date() });
    const hidden = await make(b.id, { dismissedAt: new Date() });
    const expired = await make(b.id, { createdAt: new Date(Date.now() - 20 * DAY) });
    const live1 = await make(b.id, { message: "live" });
    const snap = await live.getLiveSnapshot(b.id, cursor);
    const ids = snap.toasts.map((t) => t.id);
    expect(ids).toEqual([live1.id]);
    expect([read.id, hidden.id, expired.id].some((id) => ids.includes(id))).toBe(false);
    expect(snap.unread).toBe(1);
  });

  it("includes pending invitations in the counts", async () => {
    await db.projectInvite.create({ data: { projectId, inviterId: a.id, inviteeId: b.id, role: "VIEWER" } });
    expect((await live.getLiveSnapshot(b.id, new Date())).invites).toBe(1);
    await db.projectInvite.updateMany({ where: { inviteeId: b.id }, data: { status: "CANCELLED" } });
    expect((await live.getLiveSnapshot(b.id, new Date())).invites).toBe(0);
  });
});
