"use client";

import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "36rem" }}>
      <h1>Something went wrong</h1>
      <Alert tone="error">
        We could not load this page.{error.digest ? ` Reference: ${error.digest}.` : ""} Check your connection and try again.
      </Alert>
      <form action={reset}>
        <SubmitButton pendingLabel="Retrying...">Try again</SubmitButton>
      </form>
    </div>
  );
}
