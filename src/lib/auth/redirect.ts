/** Only allow redirects to paths inside this app. Blocks "//evil.com" and "https://evil.com". */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/^\/(login|register)(\/|\?|$)/.test(value)) return null;
  return value;
}
