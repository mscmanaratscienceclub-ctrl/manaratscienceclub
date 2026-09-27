"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GraduationCap, FlaskConical, ExternalLink, LogOut, ShieldCheck, PenSquare, HandHeart, Mail, MessageSquareText } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { trackEvent, resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";
import { cn } from "@/lib/utils";

/** Shared class for the rail's nav links — one place to retune the whole rail. */
const navLink =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors";

/**
 * The rail's own width and scroll behaviour live here; *where* it is mounted does
 * not. It renders in flow above `lg` and inside the off-canvas drawer below it
 * (`admin-shell.tsx`), so it carries no visibility classes of its own and takes
 * the caller's for that — otherwise the drawer would inherit the rail's
 * `hidden lg:flex` and vanish on exactly the screens that need it.
 */
interface SidebarProps {
  user: { name: string; email: string; role: string };
  className?: string;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
];
const formItems = [
  { href: "/admin/campus-ambassador", label: "Campus Ambassador", icon: GraduationCap, exact: false },
  { href: "/admin/volunteer", label: "Volunteer", icon: HandHeart, exact: false },
  { href: "/admin/science-competition", label: "Science Competition", icon: FlaskConical, exact: false },
  { href: "/admin/sms-logs", label: "SMS Logs", icon: MessageSquareText, exact: false },
];
const outreachItems = [
  { href: "/admin/emails", label: "Bulk Emails", icon: Mail, exact: false },
];

export default function AdminSidebar({ user, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string, exact: boolean) => exact ? pathname === href : pathname.startsWith(href);

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

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const renderLinks = (items: typeof navItems) =>
    items.map((item) => {
      const active = isActive(item.href, item.exact);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative",
            navLink,
            active
              ? "bg-white/10 text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white",
          )}
        >
          {/* A teal marker, not a background change alone: the active section
              reads at a glance even where contrast is subtle. */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-manara-teal"
            />
          )}
          <item.icon
            className={cn("size-4 shrink-0", active && "text-manara-teal")}
          />
          {item.label}
        </Link>
      );
    });

  return (
    <aside
      data-print="chrome"
      className={cn(
        "flex h-full w-56 shrink-0 flex-col border-r border-white/8 bg-ink",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-manara-teal to-manara-purple">
          <ShieldCheck className="size-4.5 text-white" />
        </div>
        <div>
          <p className="font-display text-sm font-bold leading-none text-white">Grand Admin</p>
          <p className="mt-1 text-[0.65rem] tracking-wide text-white/35 uppercase">Manarat Science Club</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">{renderLinks(navItems)}</div>

        <p className="mb-2 mt-7 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/30">Form Responses</p>
        <div className="space-y-1">{renderLinks(formItems)}</div>

        <p className="mb-2 mt-7 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/30">Outreach</p>
        <div className="space-y-1">{renderLinks(outreachItems)}</div>

        <div className="mt-6 space-y-0.5 border-t border-white/8 pt-4">
          <Link href="/cms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-manara-yellow/80 transition-colors hover:bg-white/5 hover:text-manara-yellow">
            <PenSquare className="size-4 shrink-0" />CMS Studio
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <ExternalLink className="size-4 shrink-0" />View Site
          </Link>
        </div>
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-manara-teal to-manara-purple font-display text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/35">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="rounded-full bg-manara-teal/15 px-2.5 py-0.5 text-xs font-bold capitalize text-manara-teal">{user.role}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/35 transition-colors hover:bg-white/5 hover:text-red-400">
            <LogOut className="size-3" />Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

