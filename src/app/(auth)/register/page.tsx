import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { registerAction } from "@/server/actions/auth";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthFrame switchText="Already have an account?" switchHref="/login" switchLabel="Sign in">
      <ActionForm action={registerAction} className={styles.authForm}>
        <div className={styles.body}>
          <h1 className={styles.heading}>Create your account</h1>
          <p className={styles.lead}>Track project health and keep your team on schedule.</p>
          <Field name="name" label="Full name" autoComplete="name" required maxLength={80} autoFocus placeholder="Yaqoob Aziz" />
          <Field name="email" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" />
          <Field name="password" label="Password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." />
        </div>
        <div className={styles.footer}>
          <span className={styles.legal}>
            <i className="ri-shield-keyhole-line" aria-hidden="true" /> Passwords are stored securely hashed.
          </span>
          <SubmitButton large icon="ri-user-add-line" pendingLabel="Creating account...">Sign up</SubmitButton>
        </div>
      </ActionForm>
    </AuthFrame>
  );
}
