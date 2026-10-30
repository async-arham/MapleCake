import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ActionForm } from "@/components/ui/ActionForm";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { safeNext } from "@/lib/auth/redirect";
import { flattenParams, type RawSearchParams } from "@/lib/search-params";
import { loginAction } from "@/server/actions/auth";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = flattenParams(await searchParams);
  const next = safeNext(params.next);
  const expired = params.expired === "1";
  const deleted = params.deleted === "1";
  return (
    <AuthFrame switchText="New to Maplecake?" switchHref="/register" switchLabel="Create account">
      <ActionForm action={loginAction} className={styles.authForm}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className={styles.body}>
          <div>
            <h1 className={styles.heading}>Welcome back</h1>
          </div>
          <p className={styles.lead}>Sign in to pick up where your projects left off.</p>
          {deleted ? <Alert tone="ok">Your account has been deleted. We are sorry to see you go.</Alert> : expired ? <Alert tone="info">Your session has expired. Please sign in again.</Alert> : next ? <Alert tone="info">Please sign in to continue.</Alert> : null}
          <Field name="email" label="Email" type="email" autoComplete="email" required autoFocus placeholder="you@company.com" />
          <Field name="password" label="Password" type="password" autoComplete="current-password" required />
        </div>
        <div className={styles.footer}>
          <span className={styles.legal}>
            <i className="ri-lock-2-line" aria-hidden="true" /> Your connection is encrypted.
          </span>
          <SubmitButton large icon="ri-login-circle-line" pendingLabel="Signing in...">Sign in</SubmitButton>
        </div>
      </ActionForm>
    </AuthFrame>
  );
}
