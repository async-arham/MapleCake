import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { RoleBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/SubmitButton";
import tones from "@/components/projects/project.module.css";
import { requireUser } from "@/lib/auth/session";
import { avatarTone } from "@/lib/avatar";
import { ROLE_BLURB } from "@/lib/constants";
import { timeAgo } from "@/lib/dates";
import { respondInviteAction } from "@/server/actions/invites";
import { INVITE_VALID_DAYS, listMyInvites } from "@/server/queries/invites";
import styles from "./invitations.module.css";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const user = await requireUser();
  const invites = await listMyInvites(user.id);
  const now = Date.now();

  return (
    <>
      <PageHeader title="Invitations" subtitle="Projects you have been invited to join. Nothing changes until you accept." />
      {invites.length === 0 ? (
        <EmptyState icon="mail-send" title="No pending invitations">
          When someone invites you to a project, it appears here and in your notifications. You decide whether to join.
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {invites.map((invite, i) => {
            const daysLeft = Math.max(1, Math.ceil((invite.createdAt.getTime() + INVITE_VALID_DAYS * 86_400_000 - now) / 86_400_000));
            return (
              <li key={invite.id} className={`${styles.item} rise`} style={{ "--i": i } as React.CSSProperties}>
                <span className={`${styles.avatar} ${tones[`tone${avatarTone(invite.project.name)}`]}`} aria-hidden="true">
                  {invite.project.name.charAt(0).toUpperCase()}
                </span>
                <div className={styles.body}>
                  <p className={styles.headline}>
                    <strong>{invite.inviter?.name ?? "Someone"}</strong> invited you to join <strong>{invite.project.name}</strong>
                  </p>
                  <div className={styles.meta}>
                    <RoleBadge value={invite.role} />
                    <span>{timeAgo(invite.createdAt)}</span>
                    <span>Expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}</span>
                  </div>
                  <p className={styles.blurb}>As {invite.role === "ADMIN" ? "an" : "a"} {invite.role.toLowerCase()} you can: {ROLE_BLURB[invite.role].replace(/\.$/, "").toLowerCase()}.</p>
                </div>
                <div className={styles.actions}>
                  <ActionForm action={respondInviteAction} inline>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <SubmitButton variant="secondary" pendingLabel="Declining" confirm={{ title: "Decline this invitation?", message: `You will not join “${invite.project.name}”. ${invite.inviter?.name ?? "The sender"} will be told. They can invite you again later.`, confirmLabel: "Decline" }}>
                      Decline
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={respondInviteAction} inline>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="decision" value="accept" />
                    <SubmitButton variant="dark" icon="ri-check-line" pendingLabel="Joining">Accept</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
