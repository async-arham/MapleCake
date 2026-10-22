import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Liveness + database check. Returns 503 if the database cannot be reached.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "sprintbeacon", database: "up" });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error", service: "sprintbeacon", database: "down" }, { status: 503 });
  }
}
