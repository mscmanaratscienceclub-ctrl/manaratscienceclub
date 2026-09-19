import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
  publicRoutePatterns,
} from "./routes";

/**
 * Permanent moves. `/register` used to host the Campus/Batch Ambassador and
 * Volunteer application forms; those were retired, and the path now points at
 * the STEM Fest registration so existing links and printed material keep
 * resolving somewhere useful.
 */
const permanentRedirects: Record<string, string> = {
  "/register": "/stemfestreg",
};

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);

  const redirectTarget = permanentRedirects[request.nextUrl.pathname];
  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url), 308);
  }

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isMonitoringRoute = request.nextUrl.pathname.startsWith("/monitoring");

  const isPublicRoute =
    publicRoutes.includes(request.nextUrl.pathname) ||
    publicRoutePatterns.some((pattern) =>
      pattern.test(request.nextUrl.pathname),
    );

  const isAuthRoute = () => {
    return authRoutes.some((path) => request.nextUrl.pathname.startsWith(path));
  };

  if (isApiRoute || isMonitoringRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute()) {
    if (session) {
      return NextResponse.redirect(
        new URL(DEFAULT_LOGIN_REDIRECT, request.url),
      );
    }
    return NextResponse.next();
  }

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
