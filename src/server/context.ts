import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireMembership } from "./access";
import { AppError } from "./errors";

/** Used by every project page. Signed-out -> login. Not a member -> 404. */
export const getProjectContext = cache(async (projectId: string) => {
  const user = await requireUser();
  try {
    const { project, role } = await requireMembership(user.id, projectId, "project:view");
    return { user, project, role };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});
