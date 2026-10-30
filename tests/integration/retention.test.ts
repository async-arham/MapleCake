import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const DAY = 86_400_000;

describe.skipIf(!enabled)("activity retention (real database)", () => {
  let db: typeof import("@/lib/db").db;
  let activity: typeof import("@/server/queries/activity");
  let projects: typeof import("@/server/queries/projects");
  let retention: typeof import("@/server/services/retention");
  let userId: string, projectId: string;

  const log = (ageDays: number, message: string) =>
    db.activityLog.create({ data: { projectId, actorId: userId, action: "PROJECT_UPDATED", message, createdAt: new Date(Date.now() - ageDays * DAY) } });

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    activity = await import("@/server/queries/activity");
    projects = await import("@/server/queries/projects");
    retention = await import("@/server/services/retention");
    await db.$executeRawUnsafe(`TRUNCATE "User", "Project", "ProjectMember", "Task", "ActivityLog", "Notification", "ProjectInvite" CASCADE`);
    userId = (await db.user.create({ data: { name: "Rae", email: "rae@r.dev", passwordHash: "x" } })).id;
    projectId = (await db.project.create({ data: { name: "R", ownerId: userId, members: { create: { userId, role: "OWNER" } } } })).id;
    await log(1, "fresh");
    await log(59, "almost expired");
    await log(61, "expired");
    await log(200, "ancient");
  });
  afterAll(async () => db?.$disconnect());

  it("only shows activity from the last 60 days", async () => {
    const shown = (await activity.listActivity(projectId, 1)).items.map((i) => i.message).sort();
    expect(shown).toEqual(["almost expired", "fresh"]);
    const overview = (await projects.getProjectOverview(projectId)).recentActivity.map((i) => i.message);
    expect(overview).not.toContain("expired");
    expect(overview).not.toContain("ancient");
  });

  it("deletes expired activity, but only when due, or when forced by the daily job", async () => {
    const now = new Date();
    const first = await retention.purgeExpiredRecords({ force: true, now });
    expect(first.activity).toBe(2);
    expect(await db.activityLog.count({ where: { projectId } })).toBe(2);
    const again = await retention.purgeExpiredRecords({ now: new Date(now.getTime() + 60_000) });
    expect(again.skipped).toBe(true); // ran less than an hour ago
    await log(70, "old again");
    const forced = await retention.purgeExpiredRecords({ force: true, now });
    expect(forced.activity).toBe(1);
  });
});
