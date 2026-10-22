import { startOfTodayUtc } from "./dates";
import type { TaskPriority, TaskType } from "./constants";

/**
 * Project health score (0-100)
 * ----------------------------
 * Start at 100, then subtract points for two things only:
 *
 * 1. Overdue open tasks. Each costs points by priority:
 *    Low 2, Medium 4, High 6, Critical 10. A task more than 7 days late costs 50% more.
 *    Total deduction is capped at 55.
 * 2. Unresolved critical bugs (type Bug, priority Critical, not Done): 15 points each,
 *    capped at 45. A critical bug that is also overdue counts in both, on purpose.
 *
 * Bands: 80+ Healthy, 60-79 Watch, 40-59 At risk, below 40 Critical.
 */

export interface HealthTask {
  id: string;
  title: string;
  priority: TaskPriority;
  type: TaskType;
  dueDate: Date | null;
  assigneeId: string | null;
}

export type HealthBand = "healthy" | "watch" | "at_risk" | "critical";

export interface HealthFactor {
  id: "overdue" | "critical_bugs";
  title: string;
  points: number; // negative number
  detail: string;
  items: { id: string; title: string }[];
}

export interface HealthResult {
  score: number;
  band: HealthBand;
  label: string;
  summary: string;
  overdueCount: number;
  criticalBugCount: number;
  factors: HealthFactor[];
  actions: string[];
}

export const OVERDUE_WEIGHT: Record<TaskPriority, number> = { LOW: 2, MEDIUM: 4, HIGH: 6, CRITICAL: 10 };
export const OVERDUE_CAP = 55;
export const CRITICAL_BUG_POINTS = 15;
export const CRITICAL_BUG_CAP = 45;
const VERY_LATE_DAYS = 7;
const DAY_MS = 86_400_000;

export const BAND_LABEL: Record<HealthBand, string> = {
  healthy: "Healthy",
  watch: "Needs watching",
  at_risk: "At risk",
  critical: "Critical",
};

export function bandForScore(score: number): HealthBand {
  if (score >= 80) return "healthy";
  if (score >= 60) return "watch";
  if (score >= 40) return "at_risk";
  return "critical";
}

export function isOverdue(task: { dueDate: Date | null }, now: Date = new Date()): boolean {
  return task.dueDate !== null && task.dueDate.getTime() < startOfTodayUtc(now).getTime();
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** `openTasks` must contain only tasks that are not Done. */
export function computeHealth(openTasks: HealthTask[], now: Date = new Date()): HealthResult {
  const today = startOfTodayUtc(now).getTime();

  const overdue = openTasks
    .filter((t) => t.dueDate !== null && t.dueDate.getTime() < today)
    .map((t) => {
      const daysLate = Math.floor((today - (t.dueDate as Date).getTime()) / DAY_MS);
      const cost = OVERDUE_WEIGHT[t.priority] * (daysLate > VERY_LATE_DAYS ? 1.5 : 1);
      return { task: t, cost, daysLate };
    })
    .sort((a, b) => b.cost - a.cost);

  const criticalBugs = openTasks.filter((t) => t.type === "BUG" && t.priority === "CRITICAL");

  const overduePenalty = Math.min(OVERDUE_CAP, overdue.reduce((sum, o) => sum + o.cost, 0));
  const bugPenalty = Math.min(CRITICAL_BUG_CAP, criticalBugs.length * CRITICAL_BUG_POINTS);
  const score = Math.max(0, Math.min(100, Math.round(100 - overduePenalty - bugPenalty)));
  const band = bandForScore(score);

  const factors: HealthFactor[] = [];
  if (overdue.length > 0) {
    factors.push({
      id: "overdue",
      title: `${plural(overdue.length, "overdue task")}`,
      points: -Math.round(overduePenalty),
      detail:
        "Each overdue task costs 2 to 10 points depending on priority (low 2, medium 4, high 6, critical 10). Tasks more than a week late cost 50% more. This factor is capped at 55 points.",
      items: overdue.slice(0, 5).map((o) => ({ id: o.task.id, title: o.task.title })),
    });
  }
  if (criticalBugs.length > 0) {
    factors.push({
      id: "critical_bugs",
      title: `${plural(criticalBugs.length, "unresolved critical bug")}`,
      points: -bugPenalty,
      detail:
        "Each open bug marked Critical costs 15 points until it is moved to Done. This factor is capped at 45 points.",
      items: criticalBugs.slice(0, 5).map((t) => ({ id: t.id, title: t.title })),
    });
  }

  const actions: string[] = [];
  if (criticalBugs.length > 0) {
    const unassigned = criticalBugs.filter((t) => !t.assigneeId).length;
    actions.push(
      `Fix or triage ${plural(criticalBugs.length, "critical bug")} first. They cost the most points.` +
        (unassigned > 0 ? ` ${plural(unassigned, "bug")} still ${unassigned === 1 ? "has" : "have"} no assignee.` : ""),
    );
  }
  const urgentOverdue = overdue.filter((o) => o.task.priority === "CRITICAL" || o.task.priority === "HIGH");
  if (urgentOverdue.length > 0) {
    actions.push(
      `Finish or re-plan ${plural(urgentOverdue.length, "overdue high-priority task")}. Move the due date only if the scope really changed.`,
    );
  }
  const unassignedOverdue = overdue.filter((o) => !o.task.assigneeId).length;
  if (unassignedOverdue > 0) {
    actions.push(`Give an owner to ${plural(unassignedOverdue, "overdue task")} that nobody is assigned to.`);
  }
  if (overdue.length > 0 && urgentOverdue.length === 0) {
    actions.push("Clear the overdue backlog or set realistic new dates so the list stays trustworthy.");
  }
  if (overdue.length >= 5) {
    actions.push("Many tasks are late. Hold a short planning session to cut scope or reset the sprint.");
  }
  if (actions.length === 0) {
    actions.push("Nothing urgent. Keep due dates current and close finished tasks to hold this score.");
  }

  let summary: string;
  if (openTasks.length === 0) summary = "No open tasks, so nothing is dragging the score down.";
  else if (factors.length === 0) summary = "No overdue tasks and no critical bugs. The project is on track.";
  else summary = `Score is reduced by ${factors.map((f) => f.title).join(" and ")}.`;

  return {
    score,
    band,
    label: BAND_LABEL[band],
    summary,
    overdueCount: overdue.length,
    criticalBugCount: criticalBugs.length,
    factors,
    actions,
  };
}
