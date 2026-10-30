import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const DAY = 86_400_000;
const code = (p: Promise<unknown>) => p.then(() => "OK", (e: { code?: string }) => e.code ?? "ERR");

describe.skipIf(!enabled)("invitations (real database)", () => {
  let db: typeof import("@/lib/db").db;
  let inv: typeof import("@/server/services/invites");
  let members: typeof import("@/server/services/members");
  let q: typeof import("@/server/queries/invites");
  let notifQ: typeof import("@/server/queries/notifications");
  let projects: typeof import("@/server/services/projects");
  let owner: { id: string }, admin: { id: string }, bob: { id: string }, carol: { id: string }, dave: { id: string }, viewer: { id: string };
  let projectId: string;

  const user = (n: string) => db.user.create({ data: { name: n, email: `${n.toLowerCase()}@i.dev`, passwordHash: "x" } });
  const roleOf = async (userId: string) => (await db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } }))?.role ?? null;

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    inv = await import("@/server/services/invites");
    members = await import("@/server/services/members");
    q = await import("@/server/queries/invites");
    notifQ = await import("@/server/queries/notifications");
    projects = await import("@/server/services/projects");
    await db.$executeRawUnsafe(`TRUNCATE "User", "Project", "ProjectMember", "Task", "ActivityLog", "Notification", "ProjectInvite" CASCADE`);
    [owner, admin, bob, carol, dave, viewer] = (await Promise.all(["Owen", "Ada", "Bob", "Cara", "Dave", "Vi"].map(user))) as { id: string }[] as [{ id: string }, { id: string }, { id: string }, { id: string }, { id: string }, { id: string }];
    projectId = (await projects.createProject(owner.id, { name: "Invites", description: null })).id;
    await members.addMember(owner.id, projectId, "ada@i.dev", "ADMIN");
    await members.addMember(owner.id, projectId, "vi@i.dev", "VIEWER");
  });
  afterAll(async () => db?.$disconnect());

  it("does not add anyone until they accept", async () => {
    await inv.sendInvite(owner.id, projectId, "bob@i.dev", "MEMBER");
    expect(await roleOf(bob.id)).toBeNull();
    expect(await q.countMyInvites(bob.id)).toBe(1);
    expect((await notifQ.listNotifications(bob.id, 1)).items[0]?.type).toBe("INVITE_RECEIVED");
    expect(await db.activityLog.count({ where: { projectId, action: "MEMBER_INVITED" } })).toBe(1);
  });

  it("refuses silly or unsafe invitations", async () => {
    expect(await code(inv.sendInvite(owner.id, projectId, "bob@i.dev", "MEMBER"))).toBe("CONFLICT"); // already pending
    expect(await code(inv.sendInvite(owner.id, projectId, "owen@i.dev", "MEMBER"))).toBe("VALIDATION"); // yourself
    expect(await code(inv.sendInvite(owner.id, projectId, "ada@i.dev", "MEMBER"))).toBe("CONFLICT"); // already a member
    expect(await code(inv.sendInvite(owner.id, projectId, "nobody@i.dev", "MEMBER"))).toBe("VALIDATION"); // no account
    expect(await code(inv.sendInvite(admin.id, projectId, "cara@i.dev", "ADMIN"))).toBe("FORBIDDEN"); // role not below own
    expect(await code(inv.sendInvite(viewer.id, projectId, "cara@i.dev", "VIEWER"))).toBe("FORBIDDEN"); // viewers cannot invite
    expect(await code(inv.sendInvite(dave.id, projectId, "cara@i.dev", "VIEWER"))).toBe("NOT_FOUND"); // strangers see nothing
    expect(await roleOf(carol.id)).toBeNull();
  });

  it("lets only the invited person answer, and only once", async () => {
    const invite = await db.projectInvite.findFirstOrThrow({ where: { projectId, inviteeId: bob.id } });
    expect(await code(inv.respondToInvite(dave.id, invite.id, true))).toBe("NOT_FOUND"); // not theirs
    expect(await code(inv.respondToInvite(owner.id, invite.id, true))).toBe("NOT_FOUND"); // not even the sender
    const result = await inv.respondToInvite(bob.id, invite.id, true);
    expect(result).toMatchObject({ accepted: true, projectId });
    expect(await roleOf(bob.id)).toBe("MEMBER");
    expect(await code(inv.respondToInvite(bob.id, invite.id, true))).toBe("CONFLICT"); // double click
    expect(await q.countMyInvites(bob.id)).toBe(0);
    expect(await db.notification.count({ where: { userId: owner.id, type: "INVITE_ACCEPTED" } })).toBe(1);
    expect(await db.notification.count({ where: { userId: bob.id, type: "INVITE_RECEIVED", dismissedAt: null } })).toBe(0);
  });

  it("handles declining, then inviting again", async () => {
    await inv.sendInvite(admin.id, projectId, "cara@i.dev", "VIEWER");
    const invite = await db.projectInvite.findFirstOrThrow({ where: { projectId, inviteeId: carol.id } });
    await inv.respondToInvite(carol.id, invite.id, false);
    expect(await roleOf(carol.id)).toBeNull();
    expect(await db.notification.count({ where: { userId: admin.id, type: "INVITE_DECLINED" } })).toBe(1);
    await inv.sendInvite(admin.id, projectId, "cara@i.dev", "MEMBER"); // allowed again, same row reused
    const again = await db.projectInvite.findMany({ where: { projectId, inviteeId: carol.id } });
    expect(again).toHaveLength(1);
    expect(again[0]).toMatchObject({ status: "PENDING", role: "MEMBER" });
  });

  it("cancels an invitation and removes it from the invitee's alerts", async () => {
    const invite = await db.projectInvite.findFirstOrThrow({ where: { projectId, inviteeId: carol.id } });
    expect(await code(inv.cancelInvite(dave.id, projectId, invite.id))).toBe("NOT_FOUND");
    expect(await code(inv.cancelInvite(viewer.id, projectId, invite.id))).toBe("FORBIDDEN");
    await inv.cancelInvite(owner.id, projectId, invite.id);
    expect(await q.countMyInvites(carol.id)).toBe(0);
    expect(await code(inv.respondToInvite(carol.id, invite.id, true))).toBe("CONFLICT");
    expect(await db.notification.count({ where: { userId: carol.id, type: "INVITE_RECEIVED", dismissedAt: null } })).toBe(0);
    expect(await roleOf(carol.id)).toBeNull();
  });

  it("expires invitations after 14 days", async () => {
    await inv.sendInvite(owner.id, projectId, "dave@i.dev", "VIEWER");
    const invite = await db.projectInvite.findFirstOrThrow({ where: { projectId, inviteeId: dave.id } });
    await db.projectInvite.update({ where: { id: invite.id }, data: { createdAt: new Date(Date.now() - 15 * DAY) } });
    expect(await q.countMyInvites(dave.id)).toBe(0);
    expect(await code(inv.respondToInvite(dave.id, invite.id, true))).toBe("CONFLICT");
    expect(await code(inv.sendInvite(owner.id, projectId, "dave@i.dev", "VIEWER"))).toBe("OK"); // a fresh one is allowed
  });

  it("voids an invitation if the sender lost the right to send it", async () => {
    await db.projectInvite.deleteMany({ where: { projectId, inviteeId: carol.id } });
    await inv.sendInvite(admin.id, projectId, "cara@i.dev", "MEMBER");
    const invite = await db.projectInvite.findFirstOrThrow({ where: { projectId, inviteeId: carol.id } });
    const adminRow = await db.projectMember.findFirstOrThrow({ where: { projectId, userId: admin.id } });
    await members.changeMemberRole(owner.id, projectId, adminRow.id, "VIEWER"); // demoted before Cara answers
    expect(await code(inv.respondToInvite(carol.id, invite.id, true))).toBe("CONFLICT");
    expect(await roleOf(carol.id)).toBeNull();
    expect((await db.projectInvite.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe("CANCELLED");
  });

  it("caps pending invitations per project and removes invitations with the project", async () => {
    const many = await Promise.all(Array.from({ length: 25 }, (_, i) => user(`Bulk${i}`)));
    await db.projectInvite.createMany({ data: many.map((u) => ({ projectId, inviterId: owner.id, inviteeId: u.id, role: "VIEWER" as const })) });
    expect(await code(inv.sendInvite(owner.id, projectId, "dave@i.dev", "VIEWER"))).toBe("CONFLICT"); // pending already, and over the cap
    await projects.deleteProject(owner.id, projectId, "Invites");
    expect(await db.projectInvite.count({ where: { projectId } })).toBe(0);
  });
});
