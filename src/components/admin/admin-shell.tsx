"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import AdminSidebar from "./sidebar";

interface AdminShellUser {
  name: string;
  email: string;
  role: string;
}

/**
 * The admin panel's chrome: the navigation rail, its mobile drawer, and the one
 * scroll container every admin page shares.
 *
 * It is a client component because the drawer is interactive, but it holds no page
 * state — the pages stay server components and arrive as `children`, which a client
 * component renders without turning them into client components too.
 *
 * Two mobile defects live here and are fixed in one place, because every admin page
 * inherits them:
 *
 * 1. The rail is a fixed 224px (`w-56`). On a 375px phone that left ~103px of usable
 *    content, so below `lg` the rail moves off-canvas behind a top bar.
 * 2. The outer row was `h-screen`, i.e. `100vh`, which on a phone is taller than the
 *    visible area while the browser's URL bar is showing — and since the content div
 *    is the only scroller, its bottom sat under the browser chrome unreachable. It is
 *    `dvh` now, which tracks the *visible* viewport.
 */
export default function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  /**
   * Close the drawer and hand focus back to the button that opened it, so a
   * keyboard visitor lands where they left off instead of at the top of the
   * document. Navigation is the one close that must *not* pull focus back — they
   * asked to go somewhere, and the next page's own focus rules should win.
   */
  const closeNav = useCallback(() => {
    setNavOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Any navigation closes the drawer: on a phone the page you just asked for is
  // underneath it, so leaving it open hides the thing the tap was for.
  useEffect(() => setNavOpen(false), [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNav();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen, closeNav]);

  return (
    <div data-print="shell" className="flex h-dvh overflow-hidden bg-gray-50">
      {/*
        The rail is a dozen links deep and precedes the content on every admin page,
        so a keyboard visitor would tab through all of them to reach the table they
        came for. Hidden until focused — the first Tab reveals it.
      */}
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Wide screens keep the rail in flow. `hidden lg:flex` wins the display
          conflict against the sidebar's own `flex` via twMerge. */}
      <AdminSidebar user={user} className="hidden lg:flex" />

      {/* Narrow screens get the same rail as a drawer over the page. */}
      {navOpen && (
        <div data-print="chrome" className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeNav}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/50"
          />
          <div
            id="admin-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex"
          >
            <AdminSidebar user={user} className="shadow-2xl" />
            <button
              type="button"
              autoFocus
              aria-label="Close navigation menu"
              onClick={closeNav}
              className="mt-3 ml-1 flex size-9 shrink-0 items-center justify-center self-start rounded-full bg-white text-ink shadow-subtle transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-manara-teal"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          data-print="chrome"
          className="flex items-center gap-3 border-b border-ink/5 bg-surface px-4 py-3 lg:hidden"
        >
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            className="inline-flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-1.5 font-body text-sm font-medium text-ink/70 transition-colors hover:border-manara-teal hover:text-manara-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-manara-teal"
          >
            <Menu className="size-4" aria-hidden="true" />
            Menu
          </button>
          <p className="truncate font-display text-sm font-bold text-ink">
            Grand Admin
          </p>
        </div>

        <div
          id="admin-content"
          data-print="content"
          className="flex-1 overflow-auto"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
