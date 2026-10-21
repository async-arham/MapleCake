import { NextResponse } from "next/server";

// Simple liveness check. Used locally and by hosting platforms.
// Phase 2 extends this to also confirm the database connection.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "sprintbeacon" });
}
