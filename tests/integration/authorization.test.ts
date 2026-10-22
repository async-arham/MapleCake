import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs against a real PostgreSQL. Set TEST_DATABASE_URL to a disposable database that already has
// the migrations applied. WARNING: all tables in that database are emptied first.
const enabled = Boolean(process.env.TEST_DATABASE_URL);

type Mods = {
  db: typeof import("@/lib/db").db;
  auth: typeof import("@/server/services/auth");
  projects: typeof import("@/server/services/projects");
  tasks: typeof import("@/server/services/tasks");
  members: typeof import("@/server/services/members");
  notifications: typeof import("@/server/services/notifications");
  qProjects: typeof import("@/server/queries/projects");
  qTasks: typeof import("@/server/queries/tasks");
  qHealth: typeof import("@/server/queries/health");
  qDash: typeof import("@/server/queries/dashboard");
};
let m: Mods;
let alice: { id: string }, bob: { id: string }, carol: { id: string };
let project: { id: string; name: string };

const taskInput = (over: Record<string, unknown> = {}) => ({
  title: "A task",
  description: null,
  status: "TODO" as const,
  priority: "MEDIUM" as const,
  type: "TASK" as const,
  dueDate: null,
  assigneeId: null,
  ...over,
});
const code = (p: Promise<unknown>) => p.then(() => "OK", (e: { code?: string }) => e.code ?? "ERR");
const daysAgo = (n: number) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - n));

describe.skipIf(!enabled)("authorization and data rules (real database)", () => {
  beforeAll(async () => {
    m = {
      db: (await import("@/lib/db")).db,
      auth: await import("@/server/services/auth"),
      projects: await import("@/server/services/projects"),
      tasks: await import("@/server/services/tasks"),
      members: await import("@/server/services/members"),
      notifications: await import("@/server/services/notifications"),
      qProjects: await import("@/server/queries/projects"),
      qTasks: await import("@/server/queries/tasks"),
      qHealth: await import("@/server/queries/health"),
      qDash: await import("@/server/queries/dashboard"),
    };
    await m.db.$executeRawUnsafe(`TRUNCATE "User", "Project", "ProjectMember", "Task", "ActivityLog", "Notification" CASCADE`);
    const reg = (name: string) => m.auth.registerUser({ name, email: `${name.toLowerCase()}@test.dev`, password: "password-1234" });
    [alice, bob, carol] = await Promise.all([reg("Alice"), reg("Bob"), reg("Carol")]);
    project = await m.projects.createProject(alice.id, { name: "Apollo", description: null });
  });
  afterAll(async () => {
    await m?.db.$disconnect();
  });

  describe("accounts", () => {
    it("rejects duplicate emails and stores only a password hash", async () => {
      expect(await code(m.auth.registerUser({ name: "Alice 2", email: "alice@test.dev", password: "password-1234" }))).toBe("CONFLICT");
      const row = await m.db.user.findUniqueOrThrow({ where: { id: alice.id } });
      expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(row.passwordHash).not.toContain("password-1234");
    });
    it("authenticates only with the right password", async () => {
      expect(await m.auth.authenticate("alice@test.dev", "password-1234")).toMatchObject({ id: alice.id });
      expect(await m.auth.authenticate("alice@test.dev", "wrong-password-1")).toBeNull();
      expect(await m.auth.authenticate("nobody@test.dev", "password-1234")).toBeNull();
    });
    it("enforces lowercase emails in the database itself", async () => {
      await expect(m.db.user.create({ data: { name: "X", email: "UPPER@test.dev", passwordHash: "x" } })).rejects.toThrow();
    });
  });

  describe("a stranger cannot touch someone else's private project", () => {
    it("sees it nowhere in lists", async () => {
      const q = { q: "", status: "all" as const, sort: "updated" as const, page: 1 };
      expect((await m.qProjects.listProjects(bob.id, q)).projects).toHaveLength(0);
      expect((await m.qProjects.listProjects(alice.id, q)).projects).toHaveLength(1);
      expect((await m.qDash.getDashboard(bob.id)).projectCount).toBe(0);
    });
    it("gets NOT_FOUND (not FORBIDDEN) for every write, so existence is not leaked", async () => {
      expect(await code(m.projects.updateProject(bob.id, project.id, { name: "Hacked", description: null }))).toBe("NOT_FOUND");
      expect(await code(m.projects.setProjectArchived(bob.id, project.id, true))).toBe("NOT_FOUND");
      expect(await code(m.projects.deleteProject(bob.id, project.id, "Apollo"))).toBe("NOT_FOUND");
      expect(await code(m.tasks.createTask(bob.id, project.id, taskInput()))).toBe("NOT_FOUND");
      expect(await code(m.members.addMember(bob.id, project.id, "carol@test.dev", "MEMBER"))).toBe("NOT_FOUND");
    });
    it("cannot reach a task by using another project's id", async () => {
      const other = await m.projects.createProject(bob.id, { name: "Bobs", description: null });
      const secret = await m.tasks.createTask(alice.id, project.id, taskInput({ title: "Secret" }));
      expect(await code(m.tasks.updateTask(bob.id, other.id, secret.id, taskInput()))).toBe("NOT_FOUND");
      expect(await code(m.tasks.moveTask(bob.id, other.id, secret.id, "DONE"))).toBe("NOT_FOUND");
      expect(await code(m.tasks.deleteTask(bob.id, other.id, secret.id))).toBe("NOT_FOUND");
      expect(await code(m.tasks.moveTask(bob.id, project.id, secret.id, "DONE"))).toBe("NOT_FOUND");
      expect((await m.db.task.findUniqueOrThrow({ where: { id: secret.id } })).status).toBe("TODO");
    });
  });

  describe("roles", () => {
    it("viewer can read but not write", async () => {
      await m.members.addMember(alice.id, project.id, "bob@test.dev", "VIEWER");
      const q = { q: "", status: "all" as const, sort: "updated" as const, page: 1 };
      expect((await m.qProjects.listProjects(bob.id, q)).projects.some((p) => p.id === project.id)).toBe(true);
      expect(await code(m.tasks.createTask(bob.id, project.id, taskInput()))).toBe("FORBIDDEN");
      expect(await code(m.projects.updateProject(bob.id, project.id, { name: "X", description: null }))).toBe("FORBIDDEN");
    });
    it("member can work with tasks but not manage the project or team", async () => {
      const bobMember = await m.db.projectMember.findFirstOrThrow({ where: { projectId: project.id, userId: bob.id } });
      await m.members.changeMemberRole(alice.id, project.id, bobMember.id, "MEMBER");
      const mine = await m.tasks.createTask(bob.id, project.id, taskInput({ title: "Bobs task" }));
      const alices = await m.tasks.createTask(alice.id, project.id, taskInput({ title: "Alices task" }));
      expect(await code(m.tasks.updateTask(bob.id, project.id, alices.id, taskInput({ title: "Edited" })))).toBe("OK");
      expect(await code(m.tasks.deleteTask(bob.id, project.id, alices.id))).toBe("FORBIDDEN");
      expect(await code(m.tasks.deleteTask(bob.id, project.id, mine.id))).toBe("OK");
      expect(await code(m.projects.setProjectArchived(bob.id, project.id, true))).toBe("FORBIDDEN");
      expect(await code(m.projects.deleteProject(bob.id, project.id, "Apollo"))).toBe("FORBIDDEN");
      expect(await code(m.members.addMember(bob.id, project.id, "carol@test.dev", "VIEWER"))).toBe("FORBIDDEN");
    });
    it("admin cannot touch the owner, promote to admin, or remove peers", async () => {
      await m.members.addMember(alice.id, project.id, "carol@test.dev", "ADMIN");
      const ownerRow = await m.db.projectMember.findFirstOrThrow({ where: { projectId: project.id, userId: alice.id } });
      const bobRow = await m.db.projectMember.findFirstOrThrow({ where: { projectId: project.id, userId: bob.id } });
      expect(await code(m.members.changeMemberRole(carol.id, project.id, ownerRow.id, "MEMBER"))).toBe("FORBIDDEN");
      expect(await code(m.members.removeMember(carol.id, project.id, ownerRow.id))).toBe("FORBIDDEN");
      expect(await code(m.members.changeMemberRole(carol.id, project.id, bobRow.id, "ADMIN"))).toBe("FORBIDDEN");
      expect(await code(m.members.changeMemberRole(carol.id, project.id, bobRow.id, "VIEWER"))).toBe("OK");
      expect(await code(m.members.changeMemberRole(alice.id, project.id, ownerRow.id, "ADMIN"))).toBe("FORBIDDEN"); // cannot change own role
    });
    it("only the owner can delete, and must type the exact name", async () => {
      expect(await code(m.projects.deleteProject(carol.id, project.id, "Apollo"))).toBe("FORBIDDEN");
      const tmp = await m.projects.createProject(alice.id, { name: "Temp", description: null });
      await m.tasks.createTask(alice.id, tmp.id, taskInput());
      expect(await code(m.projects.deleteProject(alice.id, tmp.id, "wrong"))).toBe("VALIDATION");
      expect(await code(m.projects.deleteProject(alice.id, tmp.id, "Temp"))).toBe("OK");
      expect(await m.db.task.count({ where: { projectId: tmp.id } })).toBe(0); // cascade
    });
    it("a removed member loses access and their tasks become unassigned", async () => {
      const dave = await m.auth.registerUser({ name: "Dave", email: "dave@test.dev", password: "password-1234" });
      await m.members.addMember(alice.id, project.id, "dave@test.dev", "MEMBER");
      const t = await m.tasks.createTask(alice.id, project.id, taskInput({ assigneeId: dave.id }));
      const row = await m.db.projectMember.findFirstOrThrow({ where: { projectId: project.id, userId: dave.id } });
      await m.members.removeMember(alice.id, project.id, row.id);
      expect(await code(m.tasks.createTask(dave.id, project.id, taskInput()))).toBe("NOT_FOUND");
      expect((await m.db.task.findUniqueOrThrow({ where: { id: t.id } })).assigneeId).toBeNull();
    });
  });

  describe("task rules", () => {
    it("only allows assigning to project members", async () => {
      const outsider = await m.auth.registerUser({ name: "Eve", email: "eve@test.dev", password: "password-1234" });
      expect(await code(m.tasks.createTask(alice.id, project.id, taskInput({ assigneeId: outsider.id })))).toBe("VALIDATION");
    });
    it("sets and clears completedAt as status changes", async () => {
      const t = await m.tasks.createTask(alice.id, project.id, taskInput());
      expect((await m.tasks.moveTask(alice.id, project.id, t.id, "DONE")).completedAt).not.toBeNull();
      expect((await m.tasks.moveTask(alice.id, project.id, t.id, "IN_REVIEW")).completedAt).toBeNull();
    });
    it("records activity history", async () => {
      const t = await m.tasks.createTask(alice.id, project.id, taskInput({ title: "Logged" }));
      await m.tasks.moveTask(alice.id, project.id, t.id, "IN_PROGRESS");
      const log = await m.db.activityLog.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "asc" } });
      expect(log.map((l) => l.action)).toEqual(["TASK_CREATED", "TASK_STATUS_CHANGED"]);
      expect(log[1]?.message).toContain("To Do");
      expect(log[1]?.message).toContain("In Progress");
    });
    it("makes archived projects read-only and restorable", async () => {
      const p = await m.projects.createProject(alice.id, { name: "Old", description: null });
      await m.projects.setProjectArchived(alice.id, p.id, true);
      expect(await code(m.tasks.createTask(alice.id, p.id, taskInput()))).toBe("CONFLICT");
      await m.projects.setProjectArchived(alice.id, p.id, false);
      expect(await code(m.tasks.createTask(alice.id, p.id, taskInput()))).toBe("OK");
    });
  });

  describe("search, filter, sort and pagination", () => {
    let pid: string;
    const base = { q: "", status: "ALL", priority: "ALL", type: "ALL", assignee: "", overdue: "0", sort: "due", dir: "asc", page: 1 } as const;
    beforeAll(async () => {
      const p = await m.projects.createProject(alice.id, { name: "Listing", description: null });
      pid = p.id;
      for (let i = 1; i <= 12; i++) {
        await m.tasks.createTask(alice.id, pid, taskInput({ title: `Item ${String(i).padStart(2, "0")}`, priority: i % 2 ? "HIGH" : "LOW", type: i === 3 ? "BUG" : "TASK", dueDate: i <= 2 ? daysAgo(3) : null, assigneeId: i <= 4 ? alice.id : null }));
      }
    });
    it("paginates 10 per page", async () => {
      const p1 = await m.qTasks.listTasks(pid, alice.id, base);
      const p2 = await m.qTasks.listTasks(pid, alice.id, { ...base, page: 2 });
      expect([p1.tasks.length, p2.tasks.length, p1.total, p1.totalPages]).toEqual([10, 2, 12, 2]);
      expect(new Set([...p1.tasks, ...p2.tasks].map((t) => t.id)).size).toBe(12);
    });
    it("filters and searches", async () => {
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, priority: "HIGH" })).total).toBe(6);
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, type: "BUG" })).total).toBe(1);
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, q: "item 07" })).total).toBe(1);
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, assignee: "me" })).total).toBe(4);
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, assignee: "none" })).total).toBe(8);
      expect((await m.qTasks.listTasks(pid, alice.id, { ...base, overdue: "1" })).total).toBe(2);
    });
    it("sorts by priority and title", async () => {
      const byPri = await m.qTasks.listTasks(pid, alice.id, { ...base, sort: "priority", dir: "desc" });
      expect(byPri.tasks[0]?.priority).toBe("HIGH");
      const byTitle = await m.qTasks.listTasks(pid, alice.id, { ...base, sort: "title", dir: "desc" });
      expect(byTitle.tasks[0]?.title).toBe("Item 12");
    });
    it("searches projects by name", async () => {
      const r = await m.qProjects.listProjects(alice.id, { q: "list", status: "active", sort: "name", page: 1 });
      expect(r.projects.map((p) => p.name)).toEqual(["Listing"]);
    });
  });

  describe("health score and notifications", () => {
    let pid: string;
    beforeAll(async () => {
      pid = (await m.projects.createProject(alice.id, { name: "Health", description: null })).id;
      await m.members.addMember(alice.id, pid, "bob@test.dev", "MEMBER");
      await m.db.notification.deleteMany({});
    });
    it("drops with critical bugs and overdue tasks, and alerts the owner when it falls below 60", async () => {
      expect((await m.qHealth.getProjectHealth(pid)).score).toBe(100);
      await m.tasks.createTask(bob.id, pid, taskInput({ title: "Late", priority: "HIGH", dueDate: daysAgo(2) }));
      expect((await m.qHealth.getProjectHealth(pid)).score).toBe(94);
      for (let i = 0; i < 3; i++) await m.tasks.createTask(bob.id, pid, taskInput({ title: `Crash ${i}`, type: "BUG", priority: "CRITICAL" }));
      const h = await m.qHealth.getProjectHealth(pid);
      expect(h.score).toBe(100 - 6 - 45);
      expect(h.band).toBe("at_risk");
      const alerts = await m.db.notification.findMany({ where: { userId: alice.id, type: "HEALTH_DROPPED" } });
      expect(alerts).toHaveLength(1);
    });
    it("recovers when bugs are closed", async () => {
      const bugs = await m.db.task.findMany({ where: { projectId: pid, type: "BUG" } });
      for (const b of bugs) await m.tasks.moveTask(alice.id, pid, b.id, "DONE");
      expect((await m.qHealth.getProjectHealth(pid)).score).toBe(94);
    });
    it("notifies on assignment and creates overdue notices exactly once", async () => {
      const t = await m.tasks.createTask(alice.id, pid, taskInput({ title: "Assigned late", assigneeId: bob.id, dueDate: daysAgo(1) }));
      expect(await m.db.notification.count({ where: { userId: bob.id, type: "TASK_ASSIGNED", taskId: t.id } })).toBe(1);
      expect(await m.notifications.syncOverdueNotifications(bob.id)).toBeGreaterThanOrEqual(1);
      expect(await m.notifications.syncOverdueNotifications(bob.id)).toBe(0);
    });
    it("lets people mark only their own notifications as read", async () => {
      const mine = await m.db.notification.findFirstOrThrow({ where: { userId: alice.id, readAt: null } });
      await m.notifications.markNotificationRead(bob.id, mine.id); // wrong user
      expect((await m.db.notification.findUniqueOrThrow({ where: { id: mine.id } })).readAt).toBeNull();
      await m.notifications.markNotificationRead(alice.id, mine.id);
      expect((await m.db.notification.findUniqueOrThrow({ where: { id: mine.id } })).readAt).not.toBeNull();
    });
  });
});
