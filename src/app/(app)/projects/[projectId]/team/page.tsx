import type { Metadata } from "next";
import styles from "@/components/projects/project.module.css";
import split from "@/components/layout/split.module.css";
import { ActionForm } from "@/components/ui/ActionForm";
import { Alert } from "@/components/ui/Alert";
import { RoleBadge } from "@/components/ui/Badges";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.css";
import { ROLE_BLURB, ROLE_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/dates";
import { canAssignRole, can, canManageMember, roleRank } from "@/lib/permissions";
import { cancelInviteAction, sendInviteAction } from "@/server/actions/invites";
import { changeRoleAction, removeMemberAction } from "@/server/actions/members";
import { getProjectContext } from "@/server/context";
import { INVITE_VALID_DAYS, listProjectInvites } from "@/server/queries/invites";
import { listProjectMembers } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project, role } = await getProjectContext(projectId);
  const canManage = can(role, "member:manage");
  const [members, invites] = await Promise.all([listProjectMembers(project.id), canManage ? listProjectInvites(project.id) : Promise.resolve([])]);
  const assignable = (["ADMIN", "MEMBER", "VIEWER"] as const).filter((r) => roleRank(role) > roleRank(r));
  const archived = project.status === "ARCHIVED";
  const now = Date.now();

  return (
    <div className={styles.pageStack}>
      <section aria-labelledby="members-title">
        <h2 id="members-title" style={{ fontSize: "1.4rem", marginBottom: "0.9rem" }}>Team members</h2>
        <div className={ui.tableWrap}>
          <table className={`${ui.table} ${ui.tableStack}`}>
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
                    <td data-title>{m.user.name}{isSelf ? " (you)" : ""}</td>
                    <td data-label="Email">{m.user.email}</td>
                    <td data-label="Role">
                      {manageable ? (
                        <ActionForm action={changeRoleAction} inline requireChange>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="memberId" value={m.id} />
                          <Field name="role" label={`Role for ${m.user.name}`} labelHidden type="select" defaultValue={m.role} options={assignable.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
                          <SubmitButton variant="secondary" small pendingLabel="Saving" confirm={{ title: `Change ${m.user.name}'s role?`, message: "They get the permissions of the new role straight away.", confirmLabel: "Change role" }}>
                            Update
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <RoleBadge value={m.role} />
                      )}
                    </td>
                    <td data-label="" data-end>
                      {(manageable || (isSelf && m.role !== "OWNER")) && (
                        <ActionForm action={removeMemberAction} inline>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="memberId" value={m.id} />
                          <SubmitButton
                            variant="ghost"
                            small
                            pendingLabel="Removing"
                            confirm={isSelf
                              ? { title: "Leave this project?", message: "You will lose access until someone invites you again.", confirmLabel: "Leave project" }
                              : { title: `Remove ${m.user.name}?`, message: "They will lose access to this project and their tasks become unassigned.", confirmLabel: "Remove member" }}
                          >
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

      {canManage && (
        <div className={split.split}>
          <div className={split.column}>
            <section className={split.formCard} aria-labelledby="invite-title">
              <h2 id="invite-title">Invite someone</h2>
              <p className={split.formLead}>They get a notification and an invitation to accept. They cannot see this project until they do.</p>
              {archived ? (
                <Alert tone="info">This project is archived. Restore it in Settings to invite people.</Alert>
              ) : (
                <ActionForm action={sendInviteAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <Field name="email" label="Email of a registered user" type="email" required placeholder="name@company.com" hint="They must already have a Maplecake account." />
                  <Field name="role" label="Role" type="select" defaultValue="MEMBER" options={assignable.map((r) => ({ value: r, label: `${ROLE_LABEL[r]} · ${ROLE_BLURB[r]}` }))} />
                  <div><SubmitButton icon="ri-send-plane-2-line" pendingLabel="Sending">Send invitation</SubmitButton></div>
                </ActionForm>
              )}
            </section>

            {invites.length > 0 && (
              <section className={split.formCard} aria-labelledby="pending-title">
                <h2 id="pending-title">Pending invitations</h2>
                <p className={split.formLead}>Waiting for an answer. Invitations expire after {INVITE_VALID_DAYS} days.</p>
                <ul className={styles.list}>
                  {invites.map((invite) => {
                    const daysLeft = Math.max(1, Math.ceil((invite.createdAt.getTime() + INVITE_VALID_DAYS * 86_400_000 - now) / 86_400_000));
                    return (
                      <li key={invite.id}>
                        <span>
                          <strong>{invite.invitee.name}</strong> <span className={styles.muted}>{invite.invitee.email}</span>
                        </span>
                        <span className={styles.cell}>
                          <RoleBadge value={invite.role} />
                          <span className={styles.muted}>sent {timeAgo(invite.createdAt)} · {daysLeft}d left</span>
                          {canAssignRole(role, invite.role) && (
                            <ActionForm action={cancelInviteAction} inline>
                              <input type="hidden" name="projectId" value={project.id} />
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <SubmitButton variant="ghost" small pendingLabel="Cancelling" confirm={{ title: `Cancel the invitation for ${invite.invitee.name}?`, message: "They will no longer be able to join with this invitation.", confirmLabel: "Cancel invitation" }}>
                                Cancel
                              </SubmitButton>
                            </ActionForm>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <aside className={split.aside} aria-label="Roles">
            <div className={split.asideCard}>
              <h3>What each role can do</h3>
              <ul className={split.steps}>
                {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const).map((r) => (
                  <li key={r}>
                    <span className={split.stepIcon}><DuoIcon name={r === "OWNER" ? "vip-crown" : r === "ADMIN" ? "shield-star" : r === "MEMBER" ? "user" : "eye"} size="1em" /></span>
                    <div>
                      <div className={split.stepTitle}>{ROLE_LABEL[r]}</div>
                      <div className={split.stepText}>{ROLE_BLURB[r]}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {!canManage && <p className={styles.muted}>Only owners and admins can invite or remove people.</p>}
    </div>
  );
}
