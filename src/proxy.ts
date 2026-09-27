import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
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

  const isAuthRoute = () => {
    return authRoutes.some((path) => request.nextUrl.pathname.startsWith(path));
  };

  if (isDevPreviewRoute(request)) {
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

  if (!session) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * The matcher is a *whitelist* of the paths the proxy can actually make a
   * decision on. Everywhere else — the whole public site, static assets, `/api/*`,
   * `/monitoring` — never invokes the edge function at all.
   *
   * At build time the matcher ran on essentially every request: each public page
   * load, each API call and each static fetch spun up the middleware only to read the
   * cookie, decide "public" (or "api") and pass straight through. On Vercel's
   * free tier every one of those is a metered edge-function invocation with no
   * possible redirect, so the public surface is pure waste.
   *
   * The proxy's real jobs are: bounce an already-signed-in user off `/signin` and
   * `/signup`, and gate the private areas (`/admin`, `/cms`, `/profile`) before
   * the heavier server layouts render. Those layouts and pages re-check the session
   * server-side (defense in depth), so narrowing the matcher costs no security.
   */
  matcher: [
    "/signin",
    "/signup",
    "/admin/:path*",
    "/admin-preview",
    "/cms/:path*",
    "/profile",
  ],
};
