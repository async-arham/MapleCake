import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { OverdueBadge, PriorityBadge } from "@/components/ui/Badges";
import { CountUp } from "@/components/ui/CountUp";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageHeader } from "@/components/layout/PageHeader";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getDashboard } from "@/server/queries/dashboard";
import { countMyInvites } from "@/server/queries/invites";
import { syncOverdueNotifications } from "@/server/services/notifications";
import { purgeExpiredRecords } from "@/server/services/retention";
import styles from "./dashboard.module.css";
import invites from "../invitations/invitations.module.css";

export const metadata: Metadata = { title: "Dashboard" };

const idx = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function DashboardPage() {
  const user = await requireUser();
  await syncOverdueNotifications(user.id);
  await purgeExpiredRecords();
  const [data, pending] = await Promise.all([getDashboard(user.id), countMyInvites(user.id)]);
  const banner = pending > 0 && (
    <div className={invites.banner}>
      <span className={invites.bannerIcon}><DuoIcon name="mail-send" size="1em" /></span>
      <div className={invites.bannerText}>
        You have {pending} pending invitation{pending === 1 ? "" : "s"}
        <span>Nothing changes until you accept.</span>
      </div>
      <LinkButton href="/invitations" variant="dark" iconAfter="ri-arrow-right-line">Review</LinkButton>
    </div>
  );
  const firstName = user.name.split(" ")[0] ?? user.name;

  if (data.projectCount === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={`Welcome, ${firstName}.`} />
        {banner}
        <EmptyState
          icon="rocket-2"
          title="No active projects yet"
          action={<LinkButton href="/projects/new" icon="ri-add-line">Create your first project</LinkButton>}
        >
          Create a project to start adding tasks. Your health score and analytics appear here as soon as you do.
        </EmptyState>
      </>
    );
  }

  const weakest = data.projectHealth[0]!;
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count));
  const maxPriority = Math.max(1, ...data.openByPriority.map((s) => s.count));
  const maxWeek = Math.max(1, ...data.weekly.map((w) => w.count));

  const stats = [
    { label: "Active projects", value: data.projectCount, icon: "folder-3", tone: "yellow" },
    { label: "Open tasks", value: data.openCount, icon: "task", tone: "blue", note: `${data.myOpenCount} assigned to you` },
    { label: "Completed tasks", value: data.completedCount, icon: "checkbox-circle", tone: "green" },
    { label: "Overdue tasks", value: data.overdueCount, icon: "alarm-warning", tone: "red", warn: data.overdueCount > 0 },
    { label: "Average health", value: data.averageHealth, icon: "heart-pulse", tone: "purple" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}. Here is how your projects are doing.`}
        actions={<LinkButton href="/projects/new" variant="dark" icon="ri-add-line">New project</LinkButton>}
      />

      {banner}
      <div className={styles.stats}>
        {stats.map((s, i) => (
          <div key={s.label} className={`${styles.stat} ${s.warn ? styles.statWarn : ""} rise`} style={idx(i)}>
            <span className={styles.statIcon}>
              <DuoIcon name={s.icon} tone={s.tone as "yellow" | "blue" | "green" | "red" | "purple"} size="1em" />
            </span>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{s.value === null ? "-" : <CountUp value={s.value} />}</div>
            <div className={styles.statNote} aria-hidden={s.note ? undefined : true}>{s.note}</div>
          </div>
        ))}
      </div>

      <section className={styles.section} aria-labelledby="health-heading">
        <h2 id="health-heading">
          <span><DuoIcon name="heart-pulse" size="1em" /></span> Project health
        </h2>
        <div className={styles.healthGrid}>
          {data.projectHealth.map((p, i) => (
            <Link key={p.id} href={`/projects/${p.id}`} className={`${styles.healthCard} rise`} style={idx(i)}>
              <HealthGauge score={p.health.score} band={p.health.band} size={76} />
              <div className={styles.healthText}>
                <div className={styles.healthName}>{p.name}</div>
                <div className={styles.healthMeta}>
                  {p.health.label} · {p.health.overdueCount} overdue · {p.health.criticalBugCount} critical bug
                  {p.health.criticalBugCount === 1 ? "" : "s"}
                </div>
              </div>
              <i className={`ri-arrow-right-line ${styles.healthGo}`} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="analytics-heading">
        <h2 id="analytics-heading">
          <span><DuoIcon name="bar-chart-grouped" size="1em" /></span> Analytics
        </h2>
        <div className={styles.charts}>
          <div className={`${ui.card} rise`} style={idx(0)}>
            <h3 className={styles.chartTitle}>Tasks by status</h3>
            {data.byStatus.map((s, i) => (
              <div key={s.status} className={styles.barRow}>
                <span>{STATUS_LABEL[s.status]}</span>
                <span className={styles.barTrack}>
                  <span className={`${styles.barFill} ${styles[`fill_${s.status}`]}`} style={{ ...idx(i), width: `${(s.count / maxStatus) * 100}%` }} />
                </span>
                <span className={styles.barNum}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className={`${ui.card} rise`} style={idx(1)}>
            <h3 className={styles.chartTitle}>Open tasks by priority</h3>
            {data.openByPriority.map((s, i) => (
              <div key={s.priority} className={styles.barRow}>
                <span>{PRIORITY_LABEL[s.priority]}</span>
                <span className={styles.barTrack}>
                  <span className={`${styles.barFill} ${styles[`fill_${s.priority}`]}`} style={{ ...idx(i), width: `${(s.count / maxPriority) * 100}%` }} />
                </span>
                <span className={styles.barNum}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className={`${ui.card} rise`} style={idx(2)}>
            <h3 className={styles.chartTitle}>Completed per week</h3>
            <div className={styles.columns}>
              {data.weekly.map((w, i) => (
                <div key={w.start.toISOString()} className={styles.col}>
                  <span className={styles.colNum}>{w.count}</span>
                  <span className={styles.colBar} style={{ ...idx(i), height: `${(w.count / maxWeek) * 100}%` }} />
                  <span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(w.start)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="more-heading">
        <h2 id="more-heading">
          <span><DuoIcon name="rocket-2" size="1em" /></span> Get more done
        </h2>
        <div className={styles.actions}>
          {[
            { icon: "folder-add", title: "Create a project", text: "Start tracking another project with its own health score.", href: "/projects/new", cta: "New project" },
            { icon: "task", title: "Add a task", text: `Capture the next piece of work for ${weakest.name}.`, href: `/projects/${weakest.id}/tasks/new`, cta: "New task" },
            { icon: "team", title: "Invite your team", text: "Bring teammates in and choose what each person can do.", href: `/projects/${weakest.id}/team`, cta: "Open team" },
          ].map((a, i) => (
            <div key={a.title} className={`${styles.actionCard} rise`} style={idx(i)}>
              <span className={styles.actionIcon}><DuoIcon name={a.icon} size="1em" /></span>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
              <Link href={a.href} className={styles.arrowPill}>
                {a.cta}
                <span className={styles.arrowCircle}><i className="ri-arrow-right-line" aria-hidden="true" /></span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="attention-heading">
        <h2 id="attention-heading">
          <span><DuoIcon name="alarm-warning" size="1em" /></span> Needs attention
        </h2>
        {data.attention.length === 0 ? (
          <EmptyState icon="trophy" title="Nothing is overdue">Every open task is on schedule. Nice work.</EmptyState>
        ) : (
          <div className={ui.card}>
            <ul className={styles.list}>
              {data.attention.map((t) => (
                <li key={t.id}>
                  <span>
                    <Link href={`/projects/${t.projectId}/tasks/${t.id}`}>{t.title}</Link>
                    <span className={styles.muted}> · {t.projectName}</span>
                  </span>
                  <span className={styles.right}>
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
