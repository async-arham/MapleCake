import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { registerAction } from "@/server/actions/auth";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <Link href="/" className={styles.brand}>
          <span className={styles.lamp} aria-hidden="true" /> SprintBeacon
        </Link>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.sub}>Track project health and keep your team on schedule.</p>
        <ActionForm action={registerAction}>
          <Field name="name" label="Full name" autoComplete="name" required maxLength={80} />
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 10 characters, with a letter and a number."
          />
          <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
        </ActionForm>
        <p className={styles.switch}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
