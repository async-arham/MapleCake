import { CODE_TTL_MINUTES } from "@/lib/auth/email-code-config";
import type { Mail } from "./send";

/** The sign-up code email. The code is digits only, so nothing here needs HTML escaping. */
export function verificationEmail(to: string, code: string): Mail {
  const subject = `${code} is your Maplecake verification code`;
  const text = [
    `Your Maplecake verification code is: ${code}`,
    "",
    `It expires in ${CODE_TTL_MINUTES} minutes. Paste it into the sign-up page to finish creating your account.`,
    "",
    "If you did not try to create a Maplecake account, you can ignore this email. Nobody can sign up with your address without this code.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#faf6ec;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0d0c22;">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:700;">Maplecake</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Confirm your email address</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4f4f5e;">Paste this code into the sign-up page to finish creating your account.</p>
      <p style="margin:0 0 20px;padding:16px;text-align:center;background:#fff6bf;border-radius:14px;font-size:34px;font-weight:800;letter-spacing:8px;font-family:Consolas,Menlo,monospace;">${code}</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4f4f5e;">It expires in ${CODE_TTL_MINUTES} minutes.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8a98;">If you did not try to create a Maplecake account, you can ignore this email. Nobody can sign up with your address without this code.</p>
    </div>
  </body>
</html>`;
  return { to, subject, text, html };
}
