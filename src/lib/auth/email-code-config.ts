// Shared by the server and the sign-up form. No imports on purpose, so it is safe to bundle for the browser.

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const CODE_TTL_MS = CODE_TTL_MINUTES * 60_000;
/** How long a person must wait before asking for another code for the same email. */
export const RESEND_COOLDOWN_SECONDS = 60;
export const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
/** Wrong guesses allowed per code. After that the code is dead and a new one is needed. */
export const MAX_CODE_ATTEMPTS = 5;
/** Codes that can be sent to one email address per hour. */
export const MAX_SENDS_PER_HOUR = 5;
export const SEND_WINDOW_MS = 60 * 60_000;

// Digits typed on non-Latin keyboards (Arabic-Indic, Persian, Devanagari, full-width) are valid digits too.
const ZERO_CODE_POINTS = [0x0660, 0x06f0, 0x0966, 0xff10];

/**
 * Turns whatever was typed or pasted into plain ASCII digits.
 * "123 456", "123-456", " 123456\n" and "١٢٣٤٥٦" all become the digits only.
 */
export function normalizeCode(input: string): string {
  let out = "";
  for (const char of input) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp >= 0x30 && cp <= 0x39) {
      out += char;
      continue;
    }
    const zero = ZERO_CODE_POINTS.find((z) => cp >= z && cp <= z + 9);
    if (zero !== undefined) out += String(cp - zero);
  }
  return out;
}

export const CODE_FORMAT = new RegExp(`^\\d{${CODE_LENGTH}}$`);
