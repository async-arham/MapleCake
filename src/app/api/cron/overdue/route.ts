import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { syncOverdueNotifications } from "@/server/services/notifications";
import { purgeExpiredRecords } from "@/server/services/retention";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // cron stays disabled until a secret is configured
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Vercel Cron calls this once a day (see vercel.json) and sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const created = await syncOverdueNotifications();
  const purged = await purgeExpiredRecords({ force: true });
  return NextResponse.json({ ok: true, created, purged });
}
