import { describe, expect, it } from "vitest";
import { addDays, daysInMonth, formatKey, monthGrid, moveByMonths, parseKey, todayKey, weekdayIndex } from "@/lib/calendar";

describe("calendar helpers", () => {
  it("accepts only real dates", () => {
    expect(parseKey("2026-10-24")).toEqual({ y: 2026, m: 9, d: 24 });
    for (const bad of ["2026-02-30", "2026-13-01", "26-10-24", "0050-01-01", "", "2026-1-1"]) expect(parseKey(bad)).toBeNull();
  });
  it("knows month lengths including leap years", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2026, 9)).toBe(31);
  });
  it("moves across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(moveByMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(moveByMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(moveByMonths("2026-10-24", 12)).toBe("2027-10-24");
  });
  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-10-26")).toBe(0); // a Monday
    expect(weekdayIndex("2026-10-25")).toBe(6); // a Sunday
  });
  it("builds a 6-week grid with the right leading days", () => {
    const grid = monthGrid(2026, 9); // 1 Oct 2026 is a Thursday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ key: "2026-09-28", day: 28, inMonth: false });
    expect(grid[3]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31);
    expect(grid[41]!.key).toBe("2026-11-08");
  });
  it("formats and finds today", () => {
    expect(formatKey("2026-10-24")).toBe("Sat, Oct 24, 2026");
    expect(todayKey(new Date(2027, 0, 1, 0, 0, 5))).toBe("2027-01-01");
  });
});
