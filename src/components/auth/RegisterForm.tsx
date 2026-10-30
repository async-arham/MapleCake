"use client";

import { useEffect, useState, type MouseEvent } from "react";
import styles from "@/app/(auth)/auth.module.css";
import { ActionForm, useFormMeta } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import fieldStyles from "@/components/ui/ui.module.css";
import { CODE_LENGTH, CODE_TTL_MINUTES } from "@/lib/auth/email-code-config";
import { registerAction, sendSignupCodeAction } from "@/server/actions/auth";

const normalize = (value: string) => value.trim().toLowerCase();

/** Sign-up: name, email, password and (unless EMAIL_VERIFICATION=off) the code that was emailed. */
export function RegisterForm({ requireCode }: { requireCode: boolean }) {
  return (
    <ActionForm action={registerAction} className={styles.authForm}>
      <RegisterFields requireCode={requireCode} />
    </ActionForm>
  );
}

function RegisterFields({ requireCode }: { requireCode: boolean }) {
  const { state } = useFormMeta();

  // what the person has typed (the form keeps its own copy too; these are for the button and for keeping the password after a mistake)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // the "Send code" button
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null); // the address we last asked the server to mail
  const [until, setUntil] = useState(0); // the button stays off until this moment (milliseconds)
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  // The error from the last "Sign up" click is hidden once a fresh code has been sent, because it was about the old code.
  const [hideServerCodeErrorAt, setHideServerCodeErrorAt] = useState<number>();

  // count the seconds down on the button
  useEffect(() => {
    if (until <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [until]);

  const waiting = sentTo !== null && sentTo === normalize(email) && until > now;
  const secondsLeft = waiting ? Math.max(1, Math.ceil((until - now) / 1000)) : 0;
  const label = pending ? "Sending..." : waiting ? `Resend in ${secondsLeft}s` : sentTo !== null && sentTo === normalize(email) ? "Resend" : "Send code";

  function onEmailChange(value: string) {
    setEmail(value);
    setEmailError(undefined);
    setCodeError(undefined);
    // a code only belongs to the address it was sent to
    if (sentTo !== null && normalize(value) !== sentTo) setNotice(undefined);
  }

  async function sendCode(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    // read the address from the form itself: it is what the browser really holds (autofill, back button)
    const typed = normalize(String(new FormData(form).get("email") ?? ""));
    setEmailError(undefined);
    setCodeError(undefined);
    if (!typed) {
      setEmailError("Enter your email address first");
      form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      return;
    }

    setPending(true);
    try {
      const result = await sendSignupCodeAction(typed);
      if (result.retryAfterSeconds) {
        setSentTo(typed);
        setUntil(Date.now() + result.retryAfterSeconds * 1000);
      }
      if (result.ok) {
        setSentTo(typed);
        setNotice(
          result.devNote
            ? "Development mode: email is not set up, so the code was printed in the terminal where `npm run dev` is running."
            : `We sent a ${CODE_LENGTH}-digit code to ${typed}. It expires in ${CODE_TTL_MINUTES} minutes. Check your spam folder if it does not arrive.`,
        );
        setHideServerCodeErrorAt(state.nonce);
        form.querySelector<HTMLInputElement>('input[name="code"]')?.focus();
      } else if (result.emailError) {
        setEmailError(result.emailError);
        form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      } else {
        setCodeError(result.message ?? "We could not send the code. Please try again.");
      }
    } catch {
      setCodeError("We could not reach the server. Check your internet connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const serverCodeError = hideServerCodeErrorAt === state.nonce ? undefined : state.fieldErrors?.code;
  const shownCodeError = codeError ?? serverCodeError ?? "";

  return (
    <>
      <div className={styles.body}>
        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.lead}>Track project health and keep your team on schedule.</p>
        <Field name="name" label="Full name" autoComplete="name" required maxLength={80} autoFocus placeholder="Yaqoob Aziz" />
        <Field name="email" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" onValueChange={onEmailChange} error={emailError} />
        <Field name="password" label="Password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." defaultValue={password} onValueChange={setPassword} />
        {requireCode && (
          <Field
            name="code"
            label="Verification code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={12}
            required
            placeholder="Paste verification code"
            hint={shownCodeError ? undefined : (notice ?? `Click “Send code” and we will email you a ${CODE_LENGTH}-digit code to confirm this address.`)}
            error={shownCodeError}
            onValueChange={() => setCodeError(undefined)}
            trailing={
              <button type="button" className={fieldStyles.inlineAction} onClick={sendCode} disabled={pending || waiting}>
                {label}
              </button>
            }
          />
        )}
      </div>
      <div className={styles.footer}>
        <span className={styles.legal}>
          <i className="ri-shield-keyhole-line" aria-hidden="true" /> Passwords are stored securely hashed.
        </span>
        <SubmitButton large icon="ri-user-add-line" pendingLabel="Creating account...">Sign up</SubmitButton>
      </div>
    </>
  );
}
