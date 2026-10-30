import { ArchivedBadge, RoleBadge } from "@/components/ui/Badges";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import styles from "@/components/projects/project.module.css";
import { avatarTone } from "@/lib/avatar";
import { can } from "@/lib/permissions";
import { getProjectContext } from "@/server/context";

// IMPORTANT: do not add a loading.tsx in (app)/ or projects/ (it would wrap this layout). Streaming would
// then send "200 OK" before the access check below can answer 404 for people who are not members.
// Put loading.tsx files inside [projectId]/ or in route groups instead.
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  return (
    <>
      <div className={styles.head}>
        <span className={`${styles.avatar} ${styles[`tone${avatarTone(project.name)}`]}`} aria-hidden="true">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <div className={styles.titleRow}>
            <h1>{project.name}</h1>
            {project.status === "ARCHIVED" && <ArchivedBadge />}
            <RoleBadge value={role} />
          </div>
          {project.description && <p className={styles.desc}>{project.description}</p>}
        </div>
      </div>
      <ProjectTabs projectId={project.id} showSettings={can(role, "project:edit")} />
      {children}
    </>
  );
}
