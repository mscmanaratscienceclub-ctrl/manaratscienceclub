"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { trackEvent, resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";
import { adminAccentStyle, SECTION_ACCENT } from "@/lib/admin/accents";
import { ADMIN_ACTIONS, ADMIN_NAV_GROUPS, type AdminNavEntry } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";
import { adminChipSoft, adminChipSolid } from "./styles";
import type { LucideIcon } from "lucide-react";

/**
 * The rail: where the panel's sections live, what colour each one wears, and where
 * you account.
 *
 * It is part of the working surface, not a dark chrome band — white rail, hairline
 * divider. Each section carries *its own* hue through the chip, the marker and the
 * current page's background, so the rail doubles as the panel's legend: the colour
 * of the page you are on is the colour of the panels you are looking at.
 *
 * The links come from `src/lib/admin/nav.ts`, the same list the command palette
 * searches, so the two can never disagree about what sections exist.
 *
 * Two states beyond the plain list:
 *
 * - **Collapsed** (wide screens only, remembered in `localStorage`): chips on a
 *   narrow rail, with the section's name arriving as a tooltip on hover. The label
 *   stays in the DOM as `sr-only` text, so collapsing costs a screen reader nothing.
 * - **Search**: the trigger for the ⌘K palette, kept at the head of the rail where
 *   a keyboard visitor looks for it, not buried in the footer.
 *
 * The rail's own width and scroll behaviour live here; *where* it is mounted does
 * not. It renders in flow above `lg` and inside the off-canvas drawer below it
 * (`admin-shell.tsx`), so it carries no visibility classes of its own and takes the
 * caller's for that — otherwise the drawer would inherit the rail's `hidden lg:flex`
 * and vanish on exactly the screens that need it.
 */

const navLink =
  "relative flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 font-space-body text-sm transition-colors";

/** The name beside a chip, or the same name kept for assistive technology only. */
function RailLabel({ text, hidden }: { text: string; hidden: boolean }) {
  return <span className={hidden ? "sr-only" : "min-w-0 truncate"}>{text}</span>;
}

/** A section's name, floating beside the rail, for when the rail has no room for it. */
function RailTooltip({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full z-30 ml-3 rounded-[6px] bg-admin-ink px-2 py-1 font-space-body text-xs whitespace-nowrap text-white opacity-0 shadow-admin-dialog transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {text}
    </span>
  );
}

interface SidebarProps {
  user: { name: string; email: string; role: string };
  className?: string;
  /** Opens the command palette the shell owns. */
  onSearch: () => void;
  /** False in the mobile drawer, where an icon-only rail would be unusable. */
  collapsible?: boolean;
}

const COLLAPSE_STORAGE_KEY = "admin-rail-collapsed";

export default function AdminSidebar({
  user,
  className,
  onSearch,
  collapsible = true,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isCollapsed = collapsible && collapsed;
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Read the remembered width after mount, never during render: the server cannot
  // know what this browser chose last time, and a pre-hydration guess would flash.
  useEffect(() => {
    if (!collapsible) return;
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  }, [collapsible]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, current ? "0" : "1");
      return !current;
    });
  }, []);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          trackEvent("user_signed_out");
          resetAnalytics();
          clearSentryUser();
          router.push("/signin");
        },
      },
    });
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderLink = (item: AdminNavEntry & { icon: LucideIcon }) => {
    const active = isActive(item.href, item.exact);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        style={adminAccentStyle(item.accent)}
        className={cn(
          navLink,
          isCollapsed && "justify-center px-0",
          active
            ? "bg-admin-accent-soft font-medium text-admin-accent-ink"
            : "text-admin-ink-soft hover:bg-admin-sunken hover:text-admin-ink",
        )}
      >
        {isCollapsed && <RailTooltip text={item.label} />}
        {/* A solid marker, not a background change alone: the active section reads
            at a glance, and reads in that section's colour. */}
        {active && (
          <span
            aria-hidden="true"
            className="admin-fill absolute inset-y-1.5 left-0 w-1 rounded-r-full"
          />
        )}
        <span
          aria-hidden="true"
          className={cn(active ? adminChipSolid : adminChipSoft, "size-7")}
        >
          <item.icon className="size-4" />
        </span>
        <RailLabel text={item.label} hidden={isCollapsed} />
      </Link>
    );
  };

  return (
    <aside
      data-print="chrome"
      aria-label="Admin sections"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-admin-line bg-admin-surface",
        isCollapsed ? "w-20" : "w-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b border-admin-line px-4 py-5",
          isCollapsed && "justify-center px-0",
        )}
      >
        <span
          aria-hidden="true"
          style={adminAccentStyle(SECTION_ACCENT.dashboard)}
          className={cn(
            adminChipSolid,
            "size-8 font-mono text-2xs font-semibold",
          )}
        >
          MS
        </span>
        <div className={cn("min-w-0", isCollapsed && "sr-only")}>
          <p className="font-space-display text-lg leading-none font-medium tracking-tight text-admin-ink">
            Grand Admin
          </p>
          <p className="mt-1 font-space-body text-2xs tracking-[0.12em] text-admin-muted uppercase">
            Manarat Science Club
          </p>
        </div>
      </div>

      <div className={cn("px-3 pt-4", isCollapsed && "px-2")}>
        <button
          type="button"
          onClick={onSearch}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-[6px] border border-admin-line bg-admin-sunken px-2.5 py-2 font-space-body text-sm text-admin-muted transition-colors hover:border-admin-ink/25 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink",
            isCollapsed && "justify-center px-0",
          )}
        >
          {isCollapsed && <RailTooltip text="Search the panel" />}
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className={cn("flex-1 text-left", isCollapsed && "sr-only")}>Search</span>
          <kbd
            className={cn(
              "shrink-0 rounded-[4px] border border-admin-line bg-admin-surface px-1 font-mono text-2xs",
              isCollapsed && "hidden",
            )}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_GROUPS.map((group, index) => (
          <div key={group.title} className={cn(index > 0 && (isCollapsed ? "mt-1" : "mt-6"))}>
            {isCollapsed ? (
              /* With no room for the group's name, what is left of the heading is
                 its edge: a rule between groups, and the name kept for anyone using
                 a screen reader, for whom a collapsed rail costs nothing. */
              <>
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="mx-1 mb-2.5 mt-2 block h-px bg-admin-line"
                  />
                )}
                <span className="sr-only">{group.title}</span>
              </>
            ) : (
              <p className="mb-1.5 px-3 font-space-body text-2xs font-semibold tracking-[0.14em] text-admin-muted uppercase">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">{group.entries.map(renderLink)}</div>
          </div>
        ))}

        <div className="mt-6 space-y-0.5 border-t border-admin-line pt-4">
          {/* Leaving the panel and printing a report are not sections, so these wear
              the neutral chip instead of a hue — but they wear a chip, so they stay
              on the same text axis as the sections above. */}
          {ADMIN_ACTIONS.map((item) => {
            const label = isCollapsed ? item.label : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={cn(
                  navLink,
                  isCollapsed && "justify-center px-0",
                  "text-admin-ink-soft hover:bg-admin-sunken hover:text-admin-ink",
                )}
              >
                {label && <RailTooltip text={label} />}
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-admin-sunken text-admin-muted"
                >
                  <item.icon className="size-4" />
                </span>
                <RailLabel text={item.label} hidden={isCollapsed} />
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-admin-line p-3">
        <div
          className={cn(
            "flex items-center gap-3 px-1 py-2",
            isCollapsed && "justify-center px-0",
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-admin-line bg-admin-sunken font-mono text-2xs font-medium text-admin-ink"
          >
            {initials}
          </span>
          <div className={cn("min-w-0", isCollapsed && "sr-only")}>
            <p className="truncate font-space-body text-sm font-medium text-admin-ink">
              {user.name}
            </p>
            <p className="truncate font-space-body text-xs text-admin-muted">{user.email}</p>
          </div>
        </div>

        <div
          className={cn(
            "mt-1 flex items-center justify-between gap-2 px-1 pb-1",
            isCollapsed && "flex-col gap-2 px-0",
          )}
        >
          <span
            className={cn(
              "rounded-full bg-admin-info-bg px-2.5 py-1 font-space-body text-2xs font-semibold tracking-[0.05em] text-admin-info-ink uppercase",
              isCollapsed && "sr-only",
            )}
          >
            {user.role}
          </span>

          <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
            <button
              type="button"
              onClick={handleSignOut}
              className="group flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 font-space-body text-xs text-admin-muted transition-colors hover:bg-admin-danger-bg hover:text-admin-danger-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-danger-ink"
            >
              {isCollapsed && <RailTooltip text="Sign out" />}
              <LogOut className="size-3.5" aria-hidden="true" />
              <span className={isCollapsed ? "sr-only" : undefined}>Sign out</span>
            </button>

            {collapsible && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-pressed={collapsed}
                aria-label={collapsed ? "Expand the section rail" : "Collapse the section rail"}
                className="rounded-[6px] px-2 py-1.5 text-admin-muted transition-colors hover:bg-admin-sunken hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-3.5" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="size-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
