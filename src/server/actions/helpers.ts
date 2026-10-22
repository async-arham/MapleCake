import "server-only";
import type { ZodError } from "zod";
import type { ActionState } from "@/lib/action-state";
import { AppError } from "../errors";

export function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

export function fromZod(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
}

export type Safe<T> = { ok: true; value: T } | { ok: false; state: ActionState };

/**
 * Runs a service call and turns expected failures into form messages.
 * Unexpected errors are logged on the server and shown as a generic message.
 * Never wrap redirect() in this: do the redirect after checking the result.
 */
export async function safely<T>(fn: () => Promise<T>): Promise<Safe<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, state: { ok: false, message: error.message } };
    console.error("Unexpected action error:", error);
    return { ok: false, state: { ok: false, message: "Something went wrong. Please try again." } };
  }
}
