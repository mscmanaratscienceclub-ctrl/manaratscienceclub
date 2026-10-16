"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import CmsSidebar from "./sidebar";

/**
 * The Studio's chrome: the navigation rail, its mobile drawer, and the one scroll
 * container every CMS page shares.
 *
 * It mirrors `src/components/admin/admin-shell.tsx` rather than inventing a second
 * pattern, because the two panels answer the same question — "how do I reach the
 * other sections from a phone" — and an admin who has learned one learns both.
 *
 * The rail is a fixed `w-56`. Above `lg` it stays in flow beside the content; below
 * it, 224px of a 390px screen is more than half the working area, so the same rail
 * moves off-canvas behind a top bar and the page gets the full width.
 *
 * `h-dvh`, not `h-screen`: the content div is the only scroller, and `100vh` is
 * taller than the visible area while a phone's URL bar is showing, so the bottom of
 * every list sat under the browser chrome, unreachable. `dvh` tracks the *visible*
 * viewport.
 */
export default function CmsShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  /** Close the drawer and hand focus back to the button that opened it, so a
   *  keyboard visitor lands where they left off instead of at the top of the page.
   *  Navigation is the one close that must not pull focus back — they asked to go
   *  somewhere, and the next page's own focus rules should win. */
  const closeNav = useCallback(() => {
    setNavOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Any navigation closes the drawer: on a phone the page just asked for is
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
    <div className="relative flex h-dvh overflow-hidden bg-gray-50">
      <a
        href="#cms-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <CmsSidebar user={user} className="hidden lg:flex" />

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeNav}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/60"
          />
          <div
            id="cms-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Studio navigation"
            className="absolute inset-y-0 left-0 flex"
          >
            <CmsSidebar user={user} />
            <button
              type="button"
              autoFocus
              aria-label="Close navigation menu"
              onClick={closeNav}
              className="mt-3 ml-1 flex size-10 shrink-0 items-center justify-center self-start rounded-xl border border-white/10 bg-ink text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/8 bg-ink px-4 py-3 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
            aria-controls="cms-nav"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            <Menu className="size-4" aria-hidden="true" />
            Menu
          </button>
          <p className="truncate font-display text-sm font-bold text-white">
            MSC Studio
          </p>
        </div>

        <div id="cms-content" className="relative flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
