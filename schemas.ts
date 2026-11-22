import { z } from "zod";
import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/constants";
import { MAX_DUE_YEAR, parseDateOnly } from "@/lib/dates";
import { CODE_FORMAT, normalizeCode } from "@/lib/auth/email-code-config";

// ---------- helpers ----------
const blankToNull = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "") ? null : value;

const optionalText = (max: number, label: string) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `${label} must be at most ${max} characters`).nullable());

const id = z.string().trim().min(1, "Missing id").max(64);

// ---------- auth ----------
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
});

const CODE_MESSAGE = "Enter the 6-digit code from your email";

/** Sign-up when email verification is on. The code is cleaned up first, so "123 456" and "١٢٣٤٥٦" work. */
export const registerWithCodeSchema = registerSchema.extend({
  code: z
    .string({ error: CODE_MESSAGE })
    .transform(normalizeCode)
    .pipe(z.string().regex(CODE_FORMAT, CODE_MESSAGE)),
});

/** Asking for a code only needs the email address. */
export const sendCodeSchema = z.object({
  email: z.string({ error: "Enter a valid email address" }).trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password").max(72),
});

// ---------- profile ----------
// bcrypt only reads the first 72 BYTES, so a short password of multi-byte characters can still be too long.
const withinBcryptLimit = (value: string) => new TextEncoder().encode(value).length <= 72;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(72, "Password must be at most 72 characters"),
    newPassword: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/\d/, "Password must contain a number")
      .refine(withinBcryptLimit, "Password is too long. Some characters count as more than one byte and the limit is 72 bytes."),
    confirmPassword: z.string().min(1, "Re-enter the new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "The two passwords do not match", path: ["confirmPassword"] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "The new password must be different from your current one", path: ["newPassword"] });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm").max(72, "Password must be at most 72 characters"),
  confirmEmail: z.string().trim().toLowerCase().min(1, "Type your email address to confirm").max(254),
});

// ---------- projects ----------
export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  description: optionalText(1000, "Description"),
});

export const projectIdSchema = z.object({ projectId: id });
export const deleteProjectSchema = z.object({
  projectId: id,
  confirmName: z.string().trim().min(1, "Type the project name to confirm"),
});

// ---------- tasks ----------
const dueDate = z
  .preprocess(blankToNull, z.string().trim().nullable())
  .transform((value, ctx) => {
    if (value === null) return null;
    const parsed = parseDateOnly(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    if (parsed.getUTCFullYear() > MAX_DUE_YEAR) {
      ctx.addIssue({ code: "custom", message: `Pick a date before ${MAX_DUE_YEAR + 1}` });
      return z.NEVER;
    }
    return parsed;
  });

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200, "Title must be at most 200 characters"),
  description: optionalText(5000, "Description"),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  type: z.enum(TASK_TYPES),
  dueDate,
  assigneeId: z.preprocess(blankToNull, id.nullable()),
});

export const moveTaskSchema = z.object({ projectId: id, taskId: id, status: z.enum(TASK_STATUSES) });
export const taskRefSchema = z.object({ projectId: id, taskId: id });

// ---------- members ----------
const assignableRole = z.enum(["ADMIN", "MEMBER", "VIEWER"], "Choose a role");
export const addMemberSchema = z.object({
  projectId: id,
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  role: assignableRole,
});
export const cancelInviteSchema = z.object({ projectId: id, inviteId: id });
export const respondInviteSchema = z.object({ inviteId: id, decision: z.enum(["accept", "decline"]) });
export const changeRoleSchema = z.object({ projectId: id, memberId: id, role: assignableRole });
export const removeMemberSchema = z.object({ projectId: id, memberId: id });

// ---------- list query strings (search, filter, sort, pagination) ----------
const page = z.coerce.number().int().min(1).max(10_000).catch(1);

export const projectListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum([...PROJECT_STATUSES.map((s) => s.toLowerCase()), "all"] as ["active", "archived", "all"]).catch("active"),
  sort: z.enum(["updated", "name", "created"]).catch("updated"),
  page,
});

export const taskListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum([...TASK_STATUSES, "ALL"] as ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "ALL"]).catch("ALL"),
  priority: z.enum([...TASK_PRIORITIES, "ALL"] as ["LOW", "MEDIUM", "HIGH", "CRITICAL", "ALL"]).catch("ALL"),
  type: z.enum([...TASK_TYPES, "ALL"] as ["TASK", "BUG", "FEATURE", "ALL"]).catch("ALL"),
  assignee: z.string().max(64).catch(""), // "", "me", "none" or a user id
  overdue: z.enum(["1", "0"]).catch("0"),
  sort: z.enum(["due", "priority", "created", "updated", "title"]).catch("due"),
  dir: z.enum(["asc", "desc"]).catch("asc"),
  page,
});

export const pageOnlySchema = z.object({ page });

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterWithCodeInput = z.infer<typeof registerWithCodeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type ProjectListQuery = z.infer<typeof projectListSchema>;
export type TaskListQuery = z.infer<typeof taskListSchema>;
