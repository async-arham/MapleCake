import type { Metadata } from "next";
import split from "@/components/layout/split.module.css";
import { ActionForm } from "@/components/ui/ActionForm";
import { Alert } from "@/components/ui/Alert";
import { ArchivedBadge, RoleBadge } from "@/components/ui/Badges";
import { DeleteProjectForm } from "@/components/ui/DeleteProjectForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { archiveProjectAction, deleteProjectAction, restoreProjectAction, updateProjectAction } from "@/server/actions/projects";
import { getProjectContext } from "@/server/context";
import { getProjectFacts } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Project settings" };

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, role } = await getProjectContext(projectId);
  if (!can(role, "project:edit")) return <Alert tone="error">Only owners and admins can change project settings.</Alert>;
  const archived = project.status === "ARCHIVED";
  const facts = await getProjectFacts(project.id);

  return (
    <div className={split.split}>
      <div className={split.column}>
        <section className={split.formCard} aria-labelledby="details-title">
          <h2 id="details-title">Project details</h2>
          <p className={split.formLead}>The name and description everyone on the team sees.</p>
          <ActionForm action={updateProjectAction} requireChange>
            <input type="hidden" name="projectId" value={project.id} />
            <Field name="name" label="Project name" required maxLength={100} defaultValue={project.name} />
            <Field name="description" label="Description" type="textarea" maxLength={1000} defaultValue={project.description ?? ""} />
            <div><SubmitButton icon="ri-save-3-line">Save changes</SubmitButton></div>
          </ActionForm>
        </section>

        <section className={split.formCard} aria-labelledby="archive-title">
          <h2 id="archive-title">{archived ? "Restore project" : "Archive project"}</h2>
          <p className={split.formLead}>
            {archived
              ? "Restoring makes the project editable again and brings it back to your dashboard."
              : "Archiving makes the project read-only and hides it from the dashboard. You can restore it any time."}
          </p>
          <ActionForm action={archived ? restoreProjectAction : archiveProjectAction} inline>
            <input type="hidden" name="projectId" value={project.id} />
            <SubmitButton
              variant="secondary"
              icon={archived ? "ri-inbox-unarchive-line" : "ri-archive-line"}
              pendingLabel="Working"
              confirm={archived ? undefined : { title: "Archive this project?", message: "It becomes read-only and leaves your dashboard. You can restore it later.", confirmLabel: "Archive project" }}
            >
              {archived ? "Restore project" : "Archive project"}
            </SubmitButton>
          </ActionForm>
        </section>

        {can(role, "project:delete") && (
          <section className={`${split.formCard} ${split.danger}`} aria-labelledby="delete-title">
            <h2 id="delete-title" className={split.dangerTitle}>Delete project</h2>
            <p className={split.formLead}>This permanently deletes the project, all its tasks, activity and notifications. This cannot be undone.</p>
            <DeleteProjectForm action={deleteProjectAction} projectId={project.id} projectName={project.name} />
          </section>
        )}
      </div>

      <aside className={split.aside} aria-label="Project summary">
        <div className={split.asideCard}>
          <h3>Summary</h3>
          <dl className={split.facts}>
            <dt>Status</dt><dd>{archived ? <ArchivedBadge /> : "Active"}</dd>
            <dt>Your role</dt><dd><RoleBadge value={role} /></dd>
            <dt>Created</dt><dd>{formatDate(project.createdAt)}</dd>
            <dt>Members</dt><dd>{facts.members}</dd>
            <dt>Tasks</dt><dd>{facts.tasks} total, {facts.done} done</dd>
          </dl>
        </div>
        <div className={split.asideCard}>
          <h3>Before you archive or delete</h3>
          <ul className={split.tips}>
            <li>Archived projects keep all their data and can be restored.</li>
            <li>Deleting is permanent and only the owner can do it.</li>
            <li>To hand work over, change a teammate&apos;s role on the Team tab first.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
