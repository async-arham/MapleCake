import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const DAY = 86_400_000;

describe.skipIf(!enabled)("notifications: dismiss, expire, never re-sent (real database)", () => {
  let db: typeof import("@/lib/db").db;
  let svc: typeof import("@/server/services/notifications");
  let q: typeof import("@/server/queries/notifications");
  let a: { id: string }, b: { id: string };
  let projectId: string;

  const make = (userId: string, over: Record<string, unknown> = {}) =>
    db.notification.create({ data: { userId, type: "TASK_ASSIGNED", message: "hello", ...over } });

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    svc = await import("@/server/services/notifications");
    q = await import("@/server/queries/notifications");
    await db.$executeRawUnsafe(`TRUNCATE "User", "Project", "ProjectMember", "Task", "ActivityLog", "Notification", "ProjectInvite" CASCADE`);
    const mk = (n: string) => db.user.create({ data: { name: n, email: `${n.toLowerCase()}@n.dev`, passwordHash: "x" } });
    [a, b] = await Promise.all([mk("Ann"), mk("Ben")]);
    projectId = (await db.project.create({ data: { name: "P", ownerId: a.id, members: { create: [{ userId: a.id, role: "OWNER" }, { userId: b.id, role: "MEMBER" }] } } })).id;
  });
  afterAll(async () => db?.$disconnect());

  it("lets people dismiss only their own notifications", async () => {
    const mine = await make(a.id);
    await svc.dismissNotification(b.id, mine.id); // wrong person
    expect((await db.notification.findUniqueOrThrow({ where: { id: mine.id } })).dismissedAt).toBeNull();
    const before = await q.countUnread(a.id);
    await svc.dismissNotification(a.id, mine.id);
    expect(await q.countUnread(a.id)).toBe(before - 1);
    expect(await db.notification.count({ where: { id: mine.id } })).toBe(1); // kept, only hidden
    expect((await q.listNotifications(a.id, 1)).items.some((n) => n.id === mine.id)).toBe(false);
  });

  it("clears only read notifications, or everything", async () => {
    await db.notification.deleteMany({ where: { userId: b.id } });
    await make(b.id, { readAt: new Date() });
    await make(b.id);
    expect(await svc.dismissNotifications(b.id, "read")).toBe(1);
    expect((await q.listNotifications(b.id, 1)).total).toBe(1);
    expect(await svc.dismissNotifications(b.id, "all")).toBe(1);
    expect((await q.listNotifications(b.id, 1)).total).toBe(0);
  });

  it("hides notifications after 14 days and deletes them for good after 90", async () => {
    await db.notification.deleteMany({ where: { userId: a.id } });
    const fresh = await make(a.id);
    const old15 = await make(a.id, { createdAt: new Date(Date.now() - 15 * DAY) });
    const old91 = await make(a.id, { createdAt: new Date(Date.now() - 91 * DAY) });
    const visible = (await q.listNotifications(a.id, 1)).items.map((n) => n.id);
    expect(visible).toEqual([fresh.id]);
    expect(await q.countUnread(a.id)).toBe(1);
    expect(await svc.purgeOldNotifications()).toBe(1);
    expect(await db.notification.count({ where: { id: old91.id } })).toBe(0);
    expect(await db.notification.count({ where: { id: old15.id } })).toBe(1);
  });

  it("never sends the same overdue alert again after it was dismissed", async () => {
    await db.notification.deleteMany({ where: { userId: b.id } });
    const yesterday = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 1));
    await db.task.create({ data: { projectId, creatorId: a.id, assigneeId: b.id, title: "Late one", dueDate: yesterday } });
    expect(await svc.syncOverdueNotifications(b.id)).toBe(1);
    const n = await db.notification.findFirstOrThrow({ where: { userId: b.id, type: "TASK_OVERDUE" } });
    await svc.dismissNotification(b.id, n.id);
    expect(await svc.syncOverdueNotifications(b.id)).toBe(0);
    expect((await q.listNotifications(b.id, 1)).total).toBe(0);
  });
});
