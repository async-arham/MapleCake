import { describe, expect, it } from "vitest";
import { CODE_FORMAT, CODE_LENGTH, normalizeCode } from "../../src/lib/auth/email-code-config";
import { generateCode, hashCode, hashesMatch } from "../../src/lib/auth/email-code";

describe("generateCode", () => {
  it("always makes exactly 6 digits, including leading zeros", () => {
    for (let i = 0; i < 2000; i++) expect(generateCode()).toMatch(CODE_FORMAT);
    expect(generateCode()).toHaveLength(CODE_LENGTH);
  });

  it("is not constant", () => {
    const seen = new Set(Array.from({ length: 50 }, generateCode));
    expect(seen.size).toBeGreaterThan(40);
  });
});

describe("normalizeCode", () => {
  it.each([
    ["123456", "123456"],
    [" 123456 ", "123456"],
    ["123 456", "123456"],
    ["123-456", "123456"],
    ["123456\n", "123456"],
    ["code: 123456", "123456"],
    ["١٢٣٤٥٦", "123456"], // Arabic-Indic digits
    ["۱۲۳۴۵۶", "123456"], // Persian / Urdu digits
    ["१२३४५६", "123456"], // Devanagari digits
    ["１２３４５６", "123456"], // full-width digits
    ["", ""],
    ["abc", ""],
  ])("cleans %j to %j", (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });

  it("leaves too-short and too-long input invalid", () => {
    expect(CODE_FORMAT.test(normalizeCode("12345"))).toBe(false);
    expect(CODE_FORMAT.test(normalizeCode("1234567"))).toBe(false);
  });
});

describe("hashCode / hashesMatch", () => {
  const secret = "x".repeat(32);

  it("matches the same code, email and secret", () => {
    expect(hashesMatch(hashCode("123456", "a@b.com", secret), hashCode("123456", "a@b.com", secret))).toBe(true);
  });

  it("does not match a different code, email or secret", () => {
    const base = hashCode("123456", "a@b.com", secret);
    expect(hashesMatch(base, hashCode("123457", "a@b.com", secret))).toBe(false);
    expect(hashesMatch(base, hashCode("123456", "c@d.com", secret))).toBe(false);
    expect(hashesMatch(base, hashCode("123456", "a@b.com", "y".repeat(32)))).toBe(false);
  });

  it("never stores the code itself and survives hashes of different length", () => {
    expect(hashCode("123456", "a@b.com", secret)).not.toContain("123456");
    expect(hashesMatch("abc", "abcd")).toBe(false);
  });
});
