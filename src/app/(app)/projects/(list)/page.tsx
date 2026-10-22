import type { Metadata } from "next";
import Link from "next/link";
import { ArchivedBadge, RoleBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/layout/PageHeader";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { listProjects } from "@/server/queries/projects";
import { projectListSchema } from "@/validation/schemas";
import styles from "./projects.module.css";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireUser();
  const query = projectListSchema.parse(flattenParams(await searchParams));
  const { projects, total, totalPages } = await listProjects(user.id, query);
  const filtered = Boolean(query.q) || query.status !== "active";

  return (
    <>
      <PageHeader title="Projects" subtitle="Every project you own or belong to." actions={<LinkButton href="/projects/new">New project</LinkButton>} />

      <form method="get" className={ui.toolbar} role="search" aria-label="Filter projects">
        <div className={`${ui.field} ${ui.grow}`}>
          <label htmlFor="q" className={ui.label}>Search</label>
          <input id="q" name="q" type="search" defaultValue={query.q} placeholder="Name or description" className={ui.input} maxLength={100} />
        </div>
        <div className={ui.field}>
          <label htmlFor="status" className={ui.label}>Status</label>
          <select id="status" name="status" defaultValue={query.status} className={ui.input}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className={ui.field}>
          <label htmlFor="sort" className={ui.label}>Sort by</label>
          <select id="sort" name="sort" defaultValue={query.sort} className={ui.input}>
            <option value="updated">Recently updated</option>
            <option value="name">Name</option>
            <option value="created">Newest</option>
          </select>
        </div>
        <button type="submit" className={`${ui.btn} ${ui.secondary}`}>Apply</button>
        {filtered && <LinkButton href="/projects" variant="ghost">Clear</LinkButton>}
      </form>

      {projects.length === 0 ? (
        filtered ? (
          <EmptyState title="No projects match" action={<LinkButton href="/projects" variant="secondary">Clear filters</LinkButton>}>
            Try a different search or switch the status filter.
          </EmptyState>
        ) : (
          <EmptyState title="You have no projects yet" action={<LinkButton href="/projects/new">Create a project</LinkButton>}>
            Projects hold your tasks, team and health score.
          </EmptyState>
        )
      ) : (
        <>
          <div className={styles.grid}>
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <HealthGauge score={p.health.score} band={p.health.band} size={64} />
                  <div>
                    <div className={styles.name}>{p.name}</div>
                    <div className={styles.meta}>
                      <span>{p.health.label}</span>
                      {p.status === "ARCHIVED" && <ArchivedBadge />}
                    </div>
                  </div>
                </div>
                {p.description && <p className={styles.desc}>{p.description}</p>}
                <div className={styles.meta}>
                  <RoleBadge value={p.role} />
                  <span>{p.taskCount} tasks</span>
                  <span>·</span>
                  <span>{p.memberCount} member{p.memberCount === 1 ? "" : "s"}</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={query.page} totalPages={totalPages} total={total} basePath="/projects" noun="project" params={{ q: query.q, status: query.status, sort: query.sort }} />
        </>
      )}
    </>
  );
}
