import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { getEnv } from "@/lib/env";
import { getLiveSnapshot } from "@/server/queries/live";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// Polled every few seconds by the signed-in app so badges and alerts arrive without a refresh.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySession(token, getEnv().AUTH_SECRET) : null;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });

  const raw = request.nextUrl.searchParams.get("cursor");
  const parsed = raw ? new Date(raw) : new Date(0);
  const cursor = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  return NextResponse.json(await getLiveSnapshot(userId, cursor), { headers: NO_STORE });
}
