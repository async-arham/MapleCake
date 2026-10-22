import { PROJECT_ROLES, type ProjectRole } from "./constants";

export type Ability =
  | "project:view"
  | "project:edit"
  | "project:archive"
  | "project:delete"
  | "task:create"
  | "task:edit"
  | "task:delete"
  | "member:view"
  | "member:manage";

// The lowest role that is allowed to do each thing.
const MIN_ROLE: Record<Ability, ProjectRole> = {
  "project:view": "VIEWER",
  "project:edit": "ADMIN",
  "project:archive": "ADMIN",
  "project:delete": "OWNER",
  "task:create": "MEMBER",
  "task:edit": "MEMBER",
  "task:delete": "ADMIN", // creators may also delete their own tasks (checked in the service)
  "member:view": "VIEWER",
  "member:manage": "ADMIN",
};

/** Higher number = more power. */
export function roleRank(role: ProjectRole): number {
  return PROJECT_ROLES.length - PROJECT_ROLES.indexOf(role);
}

export function can(role: ProjectRole, ability: Ability): boolean {
  return roleRank(role) >= roleRank(MIN_ROLE[ability]);
}

/** Owner can never be handed out. You can only give roles below your own. */
export function canAssignRole(actor: ProjectRole, newRole: ProjectRole): boolean {
  return can(actor, "member:manage") && newRole !== "OWNER" && roleRank(actor) > roleRank(newRole);
}

/** You may change or remove someone only if you outrank both their current role and the new one. */
export function canManageMember(actor: ProjectRole, target: ProjectRole, newRole?: ProjectRole): boolean {
  if (!can(actor, "member:manage") || target === "OWNER" || roleRank(actor) <= roleRank(target)) return false;
  return newRole === undefined || canAssignRole(actor, newRole);
}

export function canDeleteTask(role: ProjectRole, isCreator: boolean): boolean {
  return can(role, "task:delete") || (isCreator && can(role, "task:edit"));
}
