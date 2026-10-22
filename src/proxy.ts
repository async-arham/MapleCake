import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

// Fast, optimistic gate: sends signed-out visitors to /login and signed-in visitors away from
// /login and /register. This is only a convenience. Real authorization is enforced again in
// every page and Server Action (see requireUser and requireMembership).

const PROTECTED = ["/dashboard", "/projects", "/notifications"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  const userId = token && secret ? await verifySession(token, secret) : null;

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  if (userId && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/notifications/:path*", "/login", "/register"],
};
