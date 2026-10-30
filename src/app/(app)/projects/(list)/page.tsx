import type { Metadata } from "next";
import Link from "next/link";
import { ArchivedBadge, RoleBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import ui from "@/components/ui/ui.module.css";
import { requireUser } from "@/lib/auth/session";
import { avatarTone } from "@/lib/avatar";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { listProjects } from "@/server/queries/projects";
import { projectListSchema } from "@/validation/schemas";
import styles from "./projects.module.css";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireUser();
  const query = projectListSchema.parse(flattenParams(await searchParams));
  const { projects, total, totalPages, page } = await listProjects(user.id, query);
  const filtered = Boolean(query.q) || query.status !== "active";

  return (
    <>
      <PageHeader title="Projects" subtitle="Every project you own or belong to." actions={<LinkButton href="/projects/new" icon="ri-add-line">New project</LinkButton>} />

      <form method="get" className={ui.toolbar} role="search" aria-label="Filter projects">
        <div className={`${ui.field} ${ui.grow}`}>
          <label htmlFor="q" className={ui.label}>Search</label>
          <input id="q" name="q" type="search" defaultValue={query.q} placeholder="Name or description" className={ui.input} maxLength={100} />
        </div>
        <div className={ui.field}>
          <label htmlFor="status" className={ui.label}>Status</label>
          <Select id="status" name="status" compact defaultValue={query.status} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }, { value: "all", label: "All" }]} />
        </div>
        <div className={ui.field}>
          <label htmlFor="sort" className={ui.label}>Sort by</label>
          <Select id="sort" name="sort" compact defaultValue={query.sort} options={[{ value: "updated", label: "Recently updated" }, { value: "name", label: "Name" }, { value: "created", label: "Newest" }]} />
        </div>
        <button type="submit" className={`${ui.btn} ${ui.dark}`}><i className="ri-filter-3-line" aria-hidden="true" /> Apply</button>
        {filtered && <LinkButton href="/projects" variant="ghost">Clear</LinkButton>}
      </form>

      {projects.length === 0 ? (
        filtered ? (
          <EmptyState icon="ri-search-eye-line" title="No projects match" action={<LinkButton href="/projects" variant="secondary">Clear filters</LinkButton>}>
            Try a different search or switch the status filter.
          </EmptyState>
        ) : (
          <EmptyState icon="ri-folder-add-line" title="You have no projects yet" action={<LinkButton href="/projects/new" icon="ri-add-line">Create a project</LinkButton>}>
            Projects hold your tasks, team and health score.
          </EmptyState>
        )
      ) : (
        <>
          <div className={styles.grid}>
            {projects.map((p, i) => (
              <Link key={p.id} href={`/projects/${p.id}`} className={`${styles.card} rise`} style={{ "--i": i } as React.CSSProperties}>
                <div className={styles.cardTop}>
                  <span className={`${styles.avatar} ${styles[`tone${avatarTone(p.name)}`]}`} aria-hidden="true">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <div className={styles.titleBox}>
                    <div className={styles.name}>{p.name}</div>
                    <div className={styles.band}>
                      {p.health.label}
                      {p.status === "ARCHIVED" && <ArchivedBadge />}
                    </div>
                  </div>
                  <HealthGauge score={p.health.score} band={p.health.band} size={58} />
                </div>
                <p className={styles.desc}>{p.description ?? "No description yet."}</p>
                <div className={styles.meta}>
                  <RoleBadge value={p.role} />
                  <span><i className="ri-list-check-2" aria-hidden="true" /> {p.taskCount} task{p.taskCount === 1 ? "" : "s"}</span>
                  <span><i className="ri-team-line" aria-hidden="true" /> {p.memberCount}</span>
                  <i className={`ri-arrow-right-line ${styles.go}`} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} basePath="/projects" noun="project" params={{ q: query.q, status: query.status, sort: query.sort }} />
        </>
      )}
    </>
  );
}
