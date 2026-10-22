import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "@/components/projects/project.module.css";
import ui from "@/components/ui/ui.module.css";
import { can } from "@/lib/permissions";
import { archiveProjectAction, deleteProjectAction, restoreProjectAction, updateProjectAction } from "@/server/actions/projects";
import { getProjectContext } from "@/server/context";

export const metadata: Metadata = { title: "Project settings" };

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  if (!can(role, "project:edit")) return <Alert tone="error">Only owners and admins can change project settings.</Alert>;
  const archived = project.status === "ARCHIVED";

  return (
    <div className={styles.stack}>
      <section aria-labelledby="details-title">
        <h2 id="details-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Project details</h2>
        <ActionForm action={updateProjectAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Field name="name" label="Project name" required maxLength={100} defaultValue={project.name} />
          <Field name="description" label="Description" type="textarea" maxLength={1000} defaultValue={project.description ?? ""} />
          <div><SubmitButton>Save changes</SubmitButton></div>
        </ActionForm>
      </section>

      <section className={ui.card} aria-labelledby="archive-title">
        <h2 id="archive-title" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{archived ? "Restore project" : "Archive project"}</h2>
        <p className={styles.muted} style={{ marginBottom: "0.75rem" }}>
          {archived
            ? "Restoring makes the project editable again and brings it back to your dashboard."
            : "Archiving makes the project read-only and hides it from the dashboard. You can restore it any time."}
        </p>
        <ActionForm action={archived ? restoreProjectAction : archiveProjectAction} inline>
          <input type="hidden" name="projectId" value={project.id} />
          <SubmitButton variant="secondary" pendingLabel="Working..." confirm={archived ? undefined : "Archive this project?"}>
            {archived ? "Restore project" : "Archive project"}
          </SubmitButton>
        </ActionForm>
      </section>

      {can(role, "project:delete") && (
        <section className={`${ui.card} ${styles.danger}`} aria-labelledby="delete-title">
          <h2 id="delete-title" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Delete project</h2>
          <p className={styles.muted} style={{ marginBottom: "0.75rem" }}>
            This permanently deletes the project, all its tasks, activity and notifications. This cannot be undone.
          </p>
          <ActionForm action={deleteProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <Field name="confirmName" label={`Type “${project.name}” to confirm`} required />
            <div><SubmitButton variant="danger" pendingLabel="Deleting...">Delete project</SubmitButton></div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
