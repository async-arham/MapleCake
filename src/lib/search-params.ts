export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Next.js gives repeated query keys as arrays. We only ever want the first value. */
export function flattenParams(params: RawSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) out[key] = first;
  }
  return out;
}
