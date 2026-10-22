import type { Metadata } from "next";
import Link from "next/link";
import { OverdueBadge, PriorityBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageHeader } from "@/components/layout/PageHeader";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getDashboard } from "@/server/queries/dashboard";
import { syncOverdueNotifications } from "@/server/services/notifications";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  await syncOverdueNotifications(user.id);
  const data = await getDashboard(user.id);

  if (data.projectCount === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={`Welcome, ${user.name}.`} />
        <EmptyState
          title="No active projects yet"
          action={<LinkButton href="/projects/new">Create your first project</LinkButton>}
        >
          Create a project to start adding tasks. Your health score and analytics appear here as soon as you do.
        </EmptyState>
      </>
    );
  }

  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count));
  const maxPriority = Math.max(1, ...data.openByPriority.map((s) => s.count));
  const maxWeek = Math.max(1, ...data.weekly.map((w) => w.count));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name}.`}
        actions={<LinkButton href="/projects/new">New project</LinkButton>}
      />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Active projects</div>
          <div className={styles.statValue}>{data.projectCount}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Open tasks</div>
          <div className={styles.statValue}>{data.openCount}</div>
          <div className={styles.muted}>{data.myOpenCount} assigned to you</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Completed tasks</div>
          <div className={styles.statValue}>{data.completedCount}</div>
        </div>
        <div className={`${styles.stat} ${data.overdueCount > 0 ? styles.statWarn : ""}`}>
          <div className={styles.statLabel}>Overdue tasks</div>
          <div className={styles.statValue}>{data.overdueCount}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Average health</div>
          <div className={styles.statValue}>{data.averageHealth ?? "-"}</div>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="health-heading">
        <h2 id="health-heading">Project health, weakest first</h2>
        <div className={styles.healthGrid}>
          {data.projectHealth.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className={styles.healthCard}>
              <HealthGauge score={p.health.score} band={p.health.band} size={72} />
              <div>
                <div className={styles.healthName}>{p.name}</div>
                <div className={styles.healthMeta}>
                  {p.health.label} · {p.health.overdueCount} overdue · {p.health.criticalBugCount} critical bug
                  {p.health.criticalBugCount === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="analytics-heading">
        <h2 id="analytics-heading">Analytics</h2>
        <div className={styles.charts}>
          <div className={ui.card}>
            <h3 className={styles.chartTitle}>Tasks by status</h3>
            {data.byStatus.map((s) => (
              <div key={s.status} className={styles.barRow}>
                <span>{STATUS_LABEL[s.status]}</span>
                <span className={styles.barTrack}>
                  <span className={`${styles.barFill} ${styles[`fill_${s.status}`]}`} style={{ display: "block", width: `${(s.count / maxStatus) * 100}%` }} />
                </span>
                <span className={styles.barNum}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className={ui.card}>
            <h3 className={styles.chartTitle}>Open tasks by priority</h3>
            {data.openByPriority.map((s) => (
              <div key={s.priority} className={styles.barRow}>
                <span>{PRIORITY_LABEL[s.priority]}</span>
                <span className={styles.barTrack}>
                  <span className={`${styles.barFill} ${styles[`fill_${s.priority}`]}`} style={{ display: "block", width: `${(s.count / maxPriority) * 100}%` }} />
                </span>
                <span className={styles.barNum}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className={ui.card}>
            <h3 className={styles.chartTitle}>Completed per week</h3>
            <div className={styles.columns}>
              {data.weekly.map((w) => (
                <div key={w.start.toISOString()} className={styles.col}>
                  <span className={styles.colNum}>{w.count}</span>
                  <span className={styles.colBar} style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                  <span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(w.start)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="attention-heading">
        <h2 id="attention-heading">Needs attention</h2>
        {data.attention.length === 0 ? (
          <EmptyState title="Nothing is overdue">Every open task is on schedule. Nice work.</EmptyState>
        ) : (
          <div className={ui.card}>
            <ul className={styles.list}>
              {data.attention.map((t) => (
                <li key={t.id}>
                  <span>
                    <Link href={`/projects/${t.projectId}/tasks/${t.id}`}>{t.title}</Link>
                    <span className={styles.muted}> · {t.projectName}</span>
                  </span>
                  <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <PriorityBadge value={t.priority} />
                    <OverdueBadge />
                    <span className={styles.muted}>due {t.dueDate ? formatDate(t.dueDate) : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
