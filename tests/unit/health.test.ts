import { describe, expect, it } from "vitest";
import { computeHealth, isOverdue, bandForScore, type HealthTask } from "@/lib/health";

const NOW = new Date("2026-10-22T12:00:00Z");
const day = (offset: number) => new Date(Date.UTC(2026, 9, 22 + offset));
let n = 0;
const task = (over: Partial<HealthTask> = {}): HealthTask => ({
  id: `t${++n}`,
  title: `Task ${n}`,
  priority: "MEDIUM",
  type: "TASK",
  dueDate: null,
  assigneeId: "u1",
  ...over,
});

describe("computeHealth", () => {
  it("scores 100 with no open tasks", () => {
    const h = computeHealth([], NOW);
    expect(h.score).toBe(100);
    expect(h.band).toBe("healthy");
    expect(h.factors).toHaveLength(0);
  });

  it("does not treat a task due today as overdue", () => {
    expect(isOverdue({ dueDate: day(0) }, NOW)).toBe(false);
    expect(isOverdue({ dueDate: day(-1) }, NOW)).toBe(true);
    expect(computeHealth([task({ dueDate: day(0) })], NOW).score).toBe(100);
  });

  it("subtracts points by priority for overdue tasks", () => {
    const h = computeHealth(
      [
        task({ priority: "LOW", dueDate: day(-1) }), // 2
        task({ priority: "MEDIUM", dueDate: day(-2) }), // 4
        task({ priority: "HIGH", dueDate: day(-3) }), // 6
        task({ priority: "CRITICAL", dueDate: day(-4) }), // 10
      ],
      NOW,
    );
    expect(h.overdueCount).toBe(4);
    expect(h.score).toBe(100 - 22);
  });

  it("charges 50% more for tasks more than a week late", () => {
    expect(computeHealth([task({ priority: "HIGH", dueDate: day(-8) })], NOW).score).toBe(100 - 9);
    expect(computeHealth([task({ priority: "HIGH", dueDate: day(-7) })], NOW).score).toBe(100 - 6);
  });

  it("subtracts 15 per unresolved critical bug", () => {
    const h = computeHealth([task({ type: "BUG", priority: "CRITICAL" }), task({ type: "BUG", priority: "CRITICAL" })], NOW);
    expect(h.criticalBugCount).toBe(2);
    expect(h.score).toBe(70);
    expect(h.factors[0]?.id).toBe("critical_bugs");
  });

  it("ignores non-critical bugs and critical non-bugs for the bug factor", () => {
    const h = computeHealth([task({ type: "BUG", priority: "HIGH" }), task({ type: "FEATURE", priority: "CRITICAL" })], NOW);
    expect(h.criticalBugCount).toBe(0);
    expect(h.score).toBe(100);
  });

  it("caps each factor and never goes below 0", () => {
    const overdue = Array.from({ length: 20 }, () => task({ priority: "CRITICAL", dueDate: day(-30) }));
    const bugs = Array.from({ length: 10 }, () => task({ type: "BUG", priority: "CRITICAL" }));
    expect(computeHealth(overdue, NOW).score).toBe(45); // 100 - 55 cap
    expect(computeHealth(bugs, NOW).score).toBe(55); // 100 - 45 cap
    expect(computeHealth([...overdue, ...bugs], NOW).score).toBe(0);
  });

  it("counts an overdue critical bug in both factors", () => {
    const h = computeHealth([task({ type: "BUG", priority: "CRITICAL", dueDate: day(-1) })], NOW);
    expect(h.score).toBe(100 - 10 - 15);
    expect(h.factors.map((f) => f.id)).toEqual(["overdue", "critical_bugs"]);
  });

  it("explains the score and suggests concrete actions", () => {
    const h = computeHealth([task({ priority: "HIGH", dueDate: day(-2), assigneeId: null }), task({ type: "BUG", priority: "CRITICAL", assigneeId: null })], NOW);
    expect(h.summary).toMatch(/overdue/);
    expect(h.factors.every((f) => f.points < 0 && f.items.length > 0)).toBe(true);
    expect(h.actions.join(" ")).toMatch(/critical bug/);
    expect(h.actions.join(" ")).toMatch(/owner/);
  });

  it("gives a calm message when nothing is wrong", () => {
    expect(computeHealth([task({ dueDate: day(5) })], NOW).actions[0]).toMatch(/Nothing urgent/);
  });

  it("maps scores to bands", () => {
    expect([100, 80, 79, 60, 59, 40, 39, 0].map(bandForScore)).toEqual(["healthy", "healthy", "watch", "watch", "at_risk", "at_risk", "critical", "critical"]);
  });
});
