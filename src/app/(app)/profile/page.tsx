import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import split from "@/components/layout/split.module.css";
import tones from "@/components/projects/project.module.css";
import { DeleteAccountForm } from "@/components/profile/DeleteAccountForm";
import { ActionForm } from "@/components/ui/ActionForm";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { avatarTone } from "@/lib/avatar";
import { formatDate, initials } from "@/lib/dates";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/server/actions/profile";
import { getAccountOverview } from "@/server/queries/profile";

export const metadata: Metadata = { title: "Profile" };

const names = (list: { name: string }[]) => list.map((p) => `“${p.name}”`).join(", ");

export default async function ProfilePage() {
  const user = await requireUser();
  const overview = await getAccountOverview(user.id);
  if (!overview) redirect("/login?expired=1"); // the account was deleted from another tab or device
  const blocked = overview.shared.length > 0;

  return (
    <>
      <PageHeader title="Profile" subtitle="Your name, your password and your account." />
      <div className={split.split}>
        <div className={split.column}>
          <section className={split.formCard} aria-labelledby="profile-title">
            <h2 id="profile-title">Your details</h2>
            <p className={split.formLead}>This is how teammates see you on tasks, the team list and the activity feed.</p>
            <ActionForm action={updateProfileAction} requireChange>
              <Field name="name" label="Full name" required maxLength={80} autoComplete="name" defaultValue={user.name} />
              <Field name="email" label="Email" type="email" disabled defaultValue={user.email} hint="Your email is your sign-in and cannot be changed here." />
              <div><SubmitButton icon="ri-save-3-line">Save changes</SubmitButton></div>
            </ActionForm>
          </section>

          <section className={split.formCard} aria-labelledby="password-title">
            <h2 id="password-title">Change password</h2>
            <p className={split.formLead}>Use at least 10 characters with a letter and a number. You stay signed in on this device.</p>
            <ActionForm action={changePasswordAction}>
              <Field name="currentPassword" label="Current password" type="password" autoComplete="current-password" required />
              <Field name="newPassword" label="New password" type="password" autoComplete="new-password" required maxLength={72} />
              <Field name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" required maxLength={72} />
              <div><SubmitButton icon="ri-lock-password-line" pendingLabel="Changing...">Change password</SubmitButton></div>
            </ActionForm>
          </section>

          <section className={`${split.formCard} ${split.danger}`} aria-labelledby="delete-title">
            <h2 id="delete-title" className={split.dangerTitle}>Delete account</h2>
            <p className={split.formLead}>
              This permanently deletes your account and signs you out everywhere you use it. Tasks you created in other people&apos;s projects stay, and tasks assigned to you become unassigned. This cannot be undone.
            </p>
            {blocked ? (
              <Alert tone="error">
                You still own {overview.shared.length === 1 ? "a project" : "projects"} shared with other people: {names(overview.shared)}. Delete {overview.shared.length === 1 ? "it" : "them"} or remove the other members first, then come back here.
              </Alert>
            ) : (
              <DeleteAccountForm action={deleteAccountAction} email={user.email} soloProjects={overview.solo.length} />
            )}
          </section>
        </div>

        <aside className={split.aside} aria-label="Account summary">
          <div className={split.asideCard}>
            <div className={split.previewTop}>
              <span className={`${split.avatarBig} ${tones[`tone${avatarTone(user.name)}`]}`} aria-hidden="true">{initials(user.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div className={split.previewName}>{user.name}</div>
                <div className={split.previewBand} style={{ overflowWrap: "anywhere" }}>{user.email}</div>
              </div>
            </div>
            <dl className={split.facts} style={{ marginTop: "1.4rem" }}>
              <dt>Member since</dt><dd>{formatDate(overview.createdAt)}</dd>
              <dt>Projects</dt><dd>{overview.projectCount}</dd>
              <dt>Open tasks</dt><dd>{overview.openAssigned} assigned to you</dd>
            </dl>
          </div>
          <div className={split.asideCard}>
            <h3>Good to know</h3>
            <ul className={split.tips}>
              <li>Changing your password does not sign out your other devices. They stay signed in until their session expires.</li>
              <li>Owners cannot leave a project that has other members. Delete the project or remove the others first.</li>
              <li>Projects only you belong to are deleted together with your account.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
