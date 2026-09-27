import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
  publicRoutePatterns,
} from "./routes";

/**
 * Whether this is the local admin verification surface.
 *
 * `/admin-preview` renders the admin chrome, tables and charts with fixture data
 * so the layout can be checked at a real phone width. `/admin` itself cannot be
 * opened without an admin session, and the only database this checkout can reach
 * is production. The surface is development-only, so the bypass is too: in a
 * production build this returns false, the request falls through to the session
 * check like any other private path, and the page 404s as well. Two dev-scoped
 * gates rather than one, because a single mistake here would expose the chrome.
 */
function isDevPreviewRoute(request: NextRequest): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.pathname === "/admin-preview"
  );
}

/**
 * `/register` is a real page again: it hosts the chooser between STEM Fest
 * event registration and the volunteer application. The old 308 to
 * `/stemfestreg` is gone — the path must render, not redirect.
 */
export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);

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

  if (isApiRoute || isMonitoringRoute || isDevPreviewRoute(request)) {
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
