"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "@/app/(auth)/auth.module.css";
import { ActionForm, useFormMeta } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.css";
import { CODE_LENGTH, normalizeCode } from "@/lib/auth/email-code-config";
import { registerAction, sendSignupCodeAction } from "@/server/actions/auth";

type Details = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Details, string>>;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

/** Step 1: name/email/password. Step 2: email code. No account is made until the code is verified. */
export function RegisterForm({ requireCode }: { requireCode: boolean }) {
  return (
    <ActionForm action={registerAction} className={`${styles.authForm} ${styles.signupForm}`}>
      <RegisterFields requireCode={requireCode} />
    </ActionForm>
  );
}

function RegisterFields({ requireCode }: { requireCode: boolean }) {
  const { state } = useFormMeta();
  const [step, setStep] = useState<"details" | "code">("details");
  const [details, setDetails] = useState<Details>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [code, setCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);
  
  const [message, setMessage] = useState("");
  const [hideServerErrorNonce, setHideServerErrorNonce] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!until) return;
    let timer: number | undefined;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() >= until && timer !== undefined) window.clearInterval(timer);
    };
    tick();
    if (Date.now() < until) timer = window.setInterval(tick, 1000);
    return () => { if (timer !== undefined) window.clearInterval(timer); };
  }, [until]);

  useEffect(() => {
    if (step === "code" && !window.matchMedia("(pointer: coarse)").matches) codeInputRef.current?.focus();
  }, [step]);

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));
  const waiting = secondsLeft > 0;
  const shownCodeError = hideServerErrorNonce === state.nonce ? "" : (state.fieldErrors?.code ?? "");

  function readAndValidate(form: HTMLFormElement): Details | null {
    if (!form.reportValidity()) return null;
    const data = new FormData(form);
    const next = {
      name: String(data.get("name") ?? "").trim(),
      email: normalizeEmail(String(data.get("email") ?? "")),
      password: String(data.get("password") ?? ""),
    };
    const problems: Errors = {};
    if (next.name.length < 2 || next.name.length > 80) problems.name = "Name must be between 2 and 80 characters.";
    if (next.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) problems.email = "Enter a valid email address.";
    if (next.password.length < 10 || next.password.length > 72 || !/[A-Za-z]/.test(next.password) || !/\d/.test(next.password)) {
      problems.password = "Use 10–72 characters, including a letter and a number.";
    }
    if (new TextEncoder().encode(next.password).length > 72) problems.password = "Password is too long (72-byte limit).";
    setErrors(problems);
    const first = (Object.keys(problems) as (keyof Details)[])[0];
    if (first) {
      form.querySelector<HTMLInputElement>(`input[name="${first}"]`)?.focus();
      return null;
    }
    return next;
  }

  async function requestCode(email: string, enteringStep: boolean) {
    if (sendingRef.current) return;
    if (!navigator.onLine) {
      setMessage("You appear to be offline. Reconnect and try again.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setMessage("");
    try {
      const result = await sendSignupCodeAction(email);
      if (result.retryAfterSeconds) {
        const timestamp = Date.now();
        setNow(timestamp);
        setUntil(timestamp + result.retryAfterSeconds * 1000);
      }
      if (result.ok) {
        setCode("");
        
        setHideServerErrorNonce(state.nonce);
        setStep("code");
      } else if (result.emailError) {
        setErrors((current) => ({ ...current, email: result.emailError }));
        setStep("details");
        setMessage("");
      } else if (enteringStep && result.message?.startsWith("A code was just sent")) {
        // The server says a code was sent recently; let them enter that code instead of getting stuck.
        setCode("");
        
        setStep("code");
      } else {
        setMessage(result.message ?? "Could not send the code. Please try again.");
      }
    } catch {
      setMessage("Couldn't reach the server. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function startSignup(form: HTMLFormElement | null) {
    if (!form || sendingRef.current || !requireCode) return;
    setMessage("");
    const next = readAndValidate(form);
    if (!next) return;
    setDetails(next);
    await requestCode(next.email, true);
  }

  function interceptEnter(event: KeyboardEvent<HTMLDivElement>) {
    if (requireCode && step === "details" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void startSignup(event.currentTarget.closest("form"));
    }
  }

  return (
    <>
      <div className={`${styles.body} ${styles.authStage} ${styles.signupCompact}`} onKeyDown={interceptEnter}>
        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.lead}>Track project health and keep your team on schedule.</p>
        <Field name="name" label="Full name" autoComplete="name" required maxLength={80} autoFocus placeholder="Yaqoob Aziz" defaultValue={details.name} disabled={requireCode && step === "code"} error={errors.name} onValueChange={() => setErrors((old) => ({ ...old, name: undefined }))} />
        <Field name="email" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" defaultValue={details.email} disabled={requireCode && step === "code"} error={errors.email} onValueChange={() => setErrors((old) => ({ ...old, email: undefined }))} />
        <Field name="password" label="Password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." defaultValue={details.password} disabled={requireCode && step === "code"} error={errors.password} onValueChange={() => setErrors((old) => ({ ...old, password: undefined }))} />
        {requireCode && step === "code" && (
          <>
            <input type="hidden" name="name" value={details.name} />
            <input type="hidden" name="email" value={details.email} />
            <input type="hidden" name="password" value={details.password} />
            <div className={`${ui.field} ${styles.inlineCodeReveal}`}>
              <div className={styles.inlineCodeRow}>
                <input
                  id="signup-email-code" ref={codeInputRef}
                  className={`${ui.input} ${shownCodeError ? ui.invalid : ""}`}
                  type="text" name="code" inputMode="numeric" autoComplete="one-time-code"
                  placeholder="Paste verification code" pattern="[0-9]{6}" title="Enter exactly 6 digits"
                  maxLength={CODE_LENGTH} value={code} required aria-invalid={Boolean(shownCodeError)}
                  onChange={(event) => {
                    setCode(normalizeCode(event.target.value).slice(0, CODE_LENGTH));
                    setHideServerErrorNonce(state.nonce);
                    setMessage("");
                  }}
                />
                <button type="button" className={styles.inlineResend} onClick={() => void requestCode(details.email, false)} disabled={sending || waiting}>
                  {sending ? "Sending" : waiting ? `Resend ${secondsLeft}s` : "Resend"}
                </button>
              </div>
              {shownCodeError && <p className={ui.fieldError} role="alert">{shownCodeError}</p>}
            </div>
          </>
        )}
        {message && <p className={styles.stepError} role="alert">{message}</p>}
      </div>
      <div className={styles.footer}>
        <span className={styles.legal}><i className="ri-shield-keyhole-line" aria-hidden="true" /> Passwords are stored securely hashed.</span>
        {requireCode && step === "details" ? (
          <button type="button" onClick={(event) => void startSignup(event.currentTarget.form)} disabled={sending} aria-busy={sending} className={`${ui.btn} ${ui.primary} ${ui.lg}`}>
            {sending ? "Sending..." : <><i className="ri-user-add-line" aria-hidden="true" /> Sign up</>}
          </button>
        ) : (
          <SubmitButton large icon={step === "code" ? "ri-shield-check-line" : "ri-user-add-line"} pendingLabel="Creating account...">
            {step === "code" ? "Verify & create" : "Sign up"}
          </SubmitButton>
        )}
      </div>
    </>
  );
}
