/**
 * Optional demo data for local development:  npm run db:seed
 * Creates two demo accounts and one realistic project. Safe to run again (it replaces the demo data).
 * Refuses to run in production.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { buildPoolConfig } from "../src/lib/pool-config";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg(buildPoolConfig(url)) });
const PASSWORD = "demo-password-1";
const day = (offset: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
};

async function main() {
  await db.project.deleteMany({ where: { name: "Demo: Checkout Rebuild" } });
  await db.user.deleteMany({ where: { email: { in: ["demo@sprintbeacon.dev", "teammate@sprintbeacon.dev"] } } });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const demo = await db.user.create({ data: { email: "demo@sprintbeacon.dev", name: "Demo Owner", passwordHash } });
  const mate = await db.user.create({ data: { email: "teammate@sprintbeacon.dev", name: "Sam Teammate", passwordHash } });

  const project = await db.project.create({
    data: {
      name: "Demo: Checkout Rebuild",
      description: "Rebuild the checkout flow with fewer steps and better error handling.",
      ownerId: demo.id,
      members: { create: [{ userId: demo.id, role: "OWNER" }, { userId: mate.id, role: "MEMBER" }] },
    },
  });

  const t = (title: string, o: Partial<{ status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; type: "TASK" | "BUG" | "FEATURE"; due: number; who: "demo" | "mate"; doneDaysAgo: number }> = {}) => ({
    projectId: project.id,
    creatorId: demo.id,
    title,
    status: o.status ?? "TODO",
    priority: o.priority ?? "MEDIUM",
    type: o.type ?? "TASK",
    dueDate: o.due === undefined ? null : day(o.due),
    assigneeId: o.who === "demo" ? demo.id : o.who === "mate" ? mate.id : null,
    completedAt: o.status === "DONE" ? day(-(o.doneDaysAgo ?? 1)) : null,
  });

  await db.task.createMany({
    data: [
      t("Payment form loses card number on validation error", { type: "BUG", priority: "CRITICAL", status: "IN_PROGRESS", who: "mate", due: -2 }),
      t("Order total wrong when coupon and gift card are combined", { type: "BUG", priority: "CRITICAL", who: "demo" }),
      t("Replace 5-step wizard with single page checkout", { type: "FEATURE", priority: "HIGH", status: "IN_PROGRESS", who: "demo", due: 6 }),
      t("Add Apple Pay", { type: "FEATURE", priority: "MEDIUM", due: 20 }),
      t("Write migration guide for partners", { priority: "HIGH", due: -9, who: "mate" }),
      t("Update error copy", { priority: "LOW", status: "IN_REVIEW", who: "demo", due: 1 }),
      t("Load test the payment endpoint", { priority: "HIGH", status: "IN_REVIEW", who: "mate", due: 3 }),
      t("Set up feature flag", { status: "DONE", who: "demo", doneDaysAgo: 2 }),
      t("Audit analytics events", { status: "DONE", who: "mate", doneDaysAgo: 9 }),
      t("Design review", { status: "DONE", who: "demo", doneDaysAgo: 16 }),
    ],
  });

  await db.activityLog.createMany({
    data: [
      { projectId: project.id, actorId: demo.id, action: "PROJECT_CREATED", message: "created the project “Demo: Checkout Rebuild”" },
      { projectId: project.id, actorId: demo.id, action: "MEMBER_ADDED", message: "added Sam Teammate as Member" },
    ],
  });
  await db.notification.create({
    data: { userId: mate.id, projectId: project.id, type: "ADDED_TO_PROJECT", message: "You were added to “Demo: Checkout Rebuild” as Member." },
  });

  console.log(`Seeded. Sign in with demo@sprintbeacon.dev or teammate@sprintbeacon.dev, password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
