import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { emailVerificationRequired } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

// Read at request time, so switching EMAIL_VERIFICATION on or off never needs a rebuild.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthFrame switchText="Already have an account?" switchHref="/login" switchLabel="Sign in">
      <RegisterForm requireCode={emailVerificationRequired()} />
    </AuthFrame>
  );
}
