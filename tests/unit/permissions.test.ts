import { describe, expect, it } from "vitest";
import { can, canAssignRole, canDeleteTask, canManageMember } from "@/lib/permissions";

describe("permissions", () => {
  it("lets every role view, but only members and above change tasks", () => {
    for (const r of ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const) expect(can(r, "project:view")).toBe(true);
    expect(can("VIEWER", "task:create")).toBe(false);
    expect(can("VIEWER", "task:edit")).toBe(false);
    expect(can("MEMBER", "task:create")).toBe(true);
  });

  it("restricts project settings and deletion", () => {
    expect(can("MEMBER", "project:edit")).toBe(false);
    expect(can("ADMIN", "project:edit")).toBe(true);
    expect(can("ADMIN", "project:archive")).toBe(true);
    expect(can("ADMIN", "project:delete")).toBe(false);
    expect(can("OWNER", "project:delete")).toBe(true);
  });

  it("only lets people hand out roles below their own, never Owner", () => {
    expect(canAssignRole("OWNER", "ADMIN")).toBe(true);
    expect(canAssignRole("OWNER", "OWNER")).toBe(false);
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "MEMBER")).toBe(true);
    expect(canAssignRole("MEMBER", "VIEWER")).toBe(false);
  });

  it("only lets people manage members who rank below them", () => {
    expect(canManageMember("OWNER", "ADMIN", "MEMBER")).toBe(true);
    expect(canManageMember("ADMIN", "ADMIN")).toBe(false);
    expect(canManageMember("ADMIN", "OWNER")).toBe(false);
    expect(canManageMember("ADMIN", "MEMBER", "ADMIN")).toBe(false);
    expect(canManageMember("ADMIN", "VIEWER", "MEMBER")).toBe(true);
    expect(canManageMember("MEMBER", "VIEWER")).toBe(false);
  });

  it("allows task deletion by admins or by the member who created it", () => {
    expect(canDeleteTask("ADMIN", false)).toBe(true);
    expect(canDeleteTask("MEMBER", true)).toBe(true);
    expect(canDeleteTask("MEMBER", false)).toBe(false);
    expect(canDeleteTask("VIEWER", true)).toBe(false);
  });
});
