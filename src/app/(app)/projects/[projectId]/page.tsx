import type { Metadata } from "next";
import Link from "next/link";
import { OverdueBadge, PriorityBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import ui from "@/components/ui/ui.module.css";
import styles from "@/components/projects/project.module.css";
import { STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/dates";
import { CRITICAL_BUG_CAP, CRITICAL_BUG_POINTS, OVERDUE_CAP, computeHealth, isOverdue } from "@/lib/health";
import { can } from "@/lib/permissions";
import { getProjectContext } from "@/server/context";
import { getProjectOverview } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  const overview = await getProjectOverview(project.id);
  const health = computeHealth(overview.openTasks);
  const base = `/projects/${project.id}`;
  const total = Object.values(overview.byStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      <section className={`${ui.card} ${styles.healthPanel}`} aria-labelledby="health-title">
        <div className={styles.gaugeBox}>
          <HealthGauge score={health.score} band={health.band} size={140} />
          <div className={`${styles.bandLabel} ${styles[`band_${health.band}`]}`}>{health.label}</div>
          <div className={styles.muted}>Project health, 0 to 100</div>
        </div>
        <div className={styles.explain}>
          <h2 id="health-title">Why this score?</h2>
          <p>{health.summary}</p>

          {health.factors.map((f) => (
            <div key={f.id} className={styles.factor}>
              <div className={styles.factorHead}>
                <span>{f.title}</span>
                <span className={styles.points}>{f.points} points</span>
              </div>
              <p className={styles.factorDetail}>{f.detail}</p>
              <ul className={styles.items}>
                {f.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`${base}/tasks/${item.id}`}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={styles.factor}>
            <h3>Suggested actions</h3>
            <ul className={styles.actions}>
              {health.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <p className={styles.formula}>
            How it works: start at 100, subtract up to {OVERDUE_CAP} points for overdue tasks and up to {CRITICAL_BUG_CAP} for
            unresolved critical bugs ({CRITICAL_BUG_POINTS} each).
          </p>
        </div>
      </section>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total tasks</div>
          <div className={styles.statValue}>{total}</div>
        </div>
        {TASK_STATUSES.map((s) => (
          <div key={s} className={styles.stat}>
            <div className={styles.statLabel}>{STATUS_LABEL[s]}</div>
            <div className={styles.statValue}>{overview.byStatus[s] ?? 0}</div>
          </div>
        ))}
        <div className={styles.stat}>
          <div className={styles.statLabel}>Members</div>
          <div className={styles.statValue}>{overview.memberCount}</div>
        </div>
      </div>

      {total === 0 && project.status === "ACTIVE" && can(role, "task:create") && (
        <EmptyState title="No tasks yet" action={<LinkButton href={`${base}/tasks/new`}>Add the first task</LinkButton>}>
          Add tasks and bugs to start tracking this project’s health.
        </EmptyState>
      )}

      <div className={styles.twoCol}>
        <section className={ui.card} aria-labelledby="attention-title">
          <h2 id="attention-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Needs attention</h2>
          {overview.attention.length === 0 ? (
            <p className={styles.muted}>No overdue tasks or critical bugs.</p>
          ) : (
            <ul className={styles.list}>
              {overview.attention.map((t) => (
                <li key={t.id}>
                  <Link href={`${base}/tasks/${t.id}`}>{t.title}</Link>
                  <span className={styles.cell}>
                    <PriorityBadge value={t.priority} />
                    {isOverdue(t) && <OverdueBadge />}
                    {t.dueDate && <span className={styles.muted}>{formatDate(t.dueDate)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={ui.card} aria-labelledby="recent-title">
          <h2 id="recent-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Recent activity</h2>
          {overview.recentActivity.length === 0 ? (
            <p className={styles.muted}>Nothing has happened yet.</p>
          ) : (
            <ul className={styles.list}>
              {overview.recentActivity.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.actor?.name ?? "Someone"}</strong> {a.message}
                  </span>
                  <span className={styles.muted} title={a.createdAt.toISOString()}>{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: "0.75rem" }}>
            <Link href={`${base}/activity`}>View all activity</Link>
          </p>
        </section>
      </div>
    </>
  );
}
