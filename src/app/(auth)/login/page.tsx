import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loginAction } from "@/server/actions/auth";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className={styles.wrap}>
      <div className={`${styles.panel}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.lamp} aria-hidden="true" /> SprintBeacon
        </Link>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>Welcome back. Pick up where your projects left off.</p>
        <ActionForm action={loginAction}>
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          <Field name="password" label="Password" type="password" autoComplete="current-password" required />
          <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
        </ActionForm>
        <p className={styles.switch}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
