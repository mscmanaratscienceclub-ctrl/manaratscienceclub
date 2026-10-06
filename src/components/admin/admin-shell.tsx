"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

import AdminSidebar from "./sidebar";
import CommandPalette from "./command-palette";

interface AdminShellUser {
  name: string;
  email: string;
  role: string;
}

/**
 * The admin panel's chrome: the navigation rail, its mobile drawer, the ⌘K palette,
 * and the one scroll container every admin page shares.
 *
 * The palette is mounted here rather than inside the rail because both the rail and
 * the mobile top bar open it, and it has to outlive the drawer it was reached from.
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
 *
 * Both the shell and the content scroller are `relative`, and that is load-bearing
 * rather than cosmetic. An absolutely positioned box is placed against its nearest
 * *positioned* ancestor; with none inside the panel, the containing block of every
 * `sr-only` label and closed `<dialog>` in a page was the initial containing block, so
 * they resolved their static position against the viewport instead of inside the
 * scroller — escaping its clip and stretching the document's scrollable overflow by
 * the full height of the table below the fold. The visible result was a page that
 * scrolled hundreds of pixels past the last row into empty canvas. Scoping them to
 * the scroller keeps them in the content, where they scroll and clip like everything
 * else.
 */
export default function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  /**
   * What had focus before the palette took it. Restored on close, so Escape leaves
   * a keyboard visitor where they left off rather than at the top of the document.
   */
  const paletteOrigin = useRef<Element | null>(null);

  const openPalette = useCallback(() => {
    paletteOrigin.current = document.activeElement;
    setPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    const origin = paletteOrigin.current;
    paletteOrigin.current = null;
    // The rail's own search button, not whatever row of the table the palette
    // covered, is where the visitor should land again.
    if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
  }, []);

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

  // ⌘K / Ctrl+K from anywhere in the panel. `preventDefault` matters on Firefox,
  // where Ctrl+K opens the browser's search bar instead of reaching the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, openPalette, closePalette]);

  return (
    <div
      data-print="shell"
      // The panel's own design scope: every `--admin-*` token, the admin type
      // stack and the heavier icon stroke are reached from here.
      data-admin
      className="relative flex h-dvh overflow-hidden bg-admin-canvas"
    >
      {/*
        The rail is a dozen links deep and precedes the content on every admin page,
        so a keyboard visitor would tab through all of them to reach the table they
        came for. Hidden until focused — the first Tab reveals it.
      */}
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[6px] focus:bg-admin-ink focus:px-4 focus:py-2 focus:font-space-body focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Wide screens keep the rail in flow. `hidden lg:flex` wins the display
          conflict against the sidebar's own `flex` via twMerge. */}
      <AdminSidebar user={user} onSearch={openPalette} className="hidden lg:flex" />

      {/* Narrow screens get the same rail as a drawer over the page. */}
      {navOpen && (
        <div data-print="chrome" className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeNav}
            className="absolute inset-0 h-full w-full cursor-default bg-admin-ink/40"
          />
          <div
            id="admin-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex"
          >
            <AdminSidebar
              user={user}
              onSearch={openPalette}
              collapsible={false}
              className="shadow-2xl"
            />
            <button
              type="button"
              autoFocus
              aria-label="Close navigation menu"
              onClick={closeNav}
              className="mt-3 ml-1 flex size-9 shrink-0 items-center justify-center self-start rounded-[6px] border border-admin-line bg-admin-surface text-admin-ink-soft transition-colors hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          data-print="chrome"
          className="flex items-center gap-3 border-b border-admin-line bg-admin-surface px-4 py-3 lg:hidden"
        >
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            className="inline-flex items-center gap-2 rounded-[6px] border border-admin-line px-3 py-1.5 font-space-body text-sm font-medium text-admin-ink-soft transition-colors hover:border-admin-ink/35 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
          >
            <Menu className="size-4" aria-hidden="true" />
            Menu
          </button>
          <p className="truncate font-space-display text-base font-medium tracking-tight text-admin-ink">
            Grand Admin
          </p>
          {/* Reachable without opening the drawer: on a phone the rail is one tap
              away, and a search box that needs that tap is not a shortcut. */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search the panel"
            className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-admin-line text-admin-ink-soft transition-colors hover:border-admin-ink/35 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          id="admin-content"
          data-print="content"
          className="relative flex-1 overflow-auto"
        >
          {children}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
