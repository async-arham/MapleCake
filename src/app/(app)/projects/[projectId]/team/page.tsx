import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/ActionForm";
import { RoleBadge } from "@/components/ui/Badges";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "@/components/projects/project.module.css";
import ui from "@/components/ui/ui.module.css";
import { ROLE_LABEL } from "@/lib/constants";
import { can, canManageMember, roleRank } from "@/lib/permissions";
import { addMemberAction, changeRoleAction, removeMemberAction } from "@/server/actions/members";
import { getProjectContext } from "@/server/context";
import { listProjectMembers } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project, role } = await getProjectContext(projectId);
  const members = await listProjectMembers(project.id);
  const canManage = can(role, "member:manage");
  const assignable = (["ADMIN", "MEMBER", "VIEWER"] as const).filter((r) => roleRank(role) > roleRank(r));

  return (
    <div className={styles.stack} style={{ maxWidth: "none" }}>
      <section aria-labelledby="members-title">
        <h2 id="members-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Team members</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.userId === user.id;
                const manageable = !isSelf && canManageMember(role, m.role);
                return (
                  <tr key={m.id}>
                    <td>{m.user.name}{isSelf ? " (you)" : ""}</td>
                    <td>{m.user.email}</td>
                    <td>
                      {manageable ? (
                        <ActionForm action={changeRoleAction} inline>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="memberId" value={m.id} />
                          <select name="role" defaultValue={m.role} aria-label={`Role for ${m.user.name}`} className={ui.input} style={{ width: "auto" }}>
                            {assignable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                          <SubmitButton variant="secondary" small pendingLabel="Saving...">Update</SubmitButton>
                        </ActionForm>
                      ) : (
                        <RoleBadge value={m.role} />
                      )}
                    </td>
                    <td>
                      {(manageable || (isSelf && m.role !== "OWNER")) && (
                        <ActionForm action={removeMemberAction} inline>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="memberId" value={m.id} />
                          <SubmitButton variant="ghost" small pendingLabel="Removing..." confirm={isSelf ? "Leave this project?" : `Remove ${m.user.name} from this project?`}>
                            {isSelf ? "Leave" : "Remove"}
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canManage ? (
        <section className={ui.card} aria-labelledby="add-title">
          <h2 id="add-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Add a member</h2>
          <ActionForm action={addMemberAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <Field name="email" label="Email of a registered user" type="email" required hint="They must already have a SprintBeacon account." />
            <Field name="role" label="Role" type="select" defaultValue="MEMBER" options={assignable.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            <SubmitButton pendingLabel="Adding...">Add member</SubmitButton>
          </ActionForm>
        </section>
      ) : (
        <p className={styles.muted}>Only owners and admins can add or remove people.</p>
      )}

      <section aria-labelledby="roles-title" className={ui.card}>
        <h2 id="roles-title" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>What each role can do</h2>
        <dl className={styles.dl}>
          <dt>Owner</dt><dd>Everything, including deleting the project.</dd>
          <dt>Admin</dt><dd>Edit and archive the project, manage members below admin, delete any task.</dd>
          <dt>Member</dt><dd>Create and edit tasks, move cards, delete tasks they created.</dd>
          <dt>Viewer</dt><dd>Read-only access to the project.</dd>
        </dl>
      </section>
    </div>
  );
}
