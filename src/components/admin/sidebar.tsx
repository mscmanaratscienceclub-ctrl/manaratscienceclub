"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  FlaskConical,
  ExternalLink,
  LogOut,
  PenSquare,
  Atom,
  SlidersHorizontal,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { trackEvent, resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";
import { cn } from "@/lib/utils";

interface SidebarProps { user: { name: string; email: string; role: string } }

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/control-panel", label: "Control Panel", icon: SlidersHorizontal, exact: true },
];
const formItems = [
  { href: "/admin/campus-ambassador", label: "Campus Ambassador", icon: GraduationCap, exact: false },
  { href: "/admin/science-competition", label: "Science Competition", icon: FlaskConical, exact: false },
  { href: "/admin/stem-fest", label: "STEM Fest", icon: FlaskConical, exact: false },
];

export default function AdminSidebar({ user }: SidebarProps) {
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
    items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 border border-transparent px-3 py-2.5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] transition-colors",
          isActive(item.href, item.exact)
            ? "border-ion-line bg-ion-deep/50 text-ion-bright"
            : "text-space-muted hover:border-ion-line hover:bg-ion-deep/25 hover:text-space-ivory"
        )}
      >
        <item.icon className={cn("size-4 shrink-0 transition-colors", isActive(item.href, item.exact) ? "text-ion" : "text-space-muted group-hover:text-ion")} />
        {item.label}
      </Link>
    ));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-space-line-soft bg-space-black">
      <div className="flex items-center gap-3 border-b border-space-line-soft px-4 py-4">
        <span className="flex size-9 items-center justify-center border border-ion-line bg-ion-deep/40">
          <Atom className="size-4 text-ion" />
        </span>
        <div>
          <p className="font-voyage text-xs font-bold uppercase tracking-[0.28em] text-space-ivory">Grand Admin</p>
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-space-muted">Manarat Science Club</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">{renderLinks(navItems)}</div>

        <p className="mb-2 mt-7 flex items-center gap-2 px-3 font-mono text-[0.56rem] font-bold uppercase tracking-[0.28em] text-space-muted">
          Form Responses
          <span aria-hidden="true" className="h-px flex-1 bg-space-line-soft" />
        </p>
        <div className="space-y-1">{renderLinks(formItems)}</div>

        <div className="mt-7 space-y-1 border-t border-space-line-soft pt-5">
          <Link href="/cms" className="flex items-center gap-3 border border-transparent px-3 py-2.5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-space-amber transition-colors hover:border-ion-line hover:text-ion-bright">
            <PenSquare className="size-4 shrink-0" />CMS Studio
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-3 border border-transparent px-3 py-2.5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-space-muted transition-colors hover:border-ion-line hover:text-space-ivory">
            <ExternalLink className="size-4 shrink-0" />View Site
          </Link>
        </div>
      </nav>

      <div className="border-t border-space-line-soft p-3">
        <div className="mb-2 flex items-center gap-3 border border-ion-line/50 bg-ion-deep/30 px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center border border-ion-line font-mono text-[0.6rem] font-bold text-ion">{initials}</span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-space-ivory">{user.name}</p>
            <p className="truncate font-mono text-[0.6rem] text-space-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="border border-ion-line bg-ion-deep/40 px-2 py-0.5 font-mono text-[0.56rem] font-bold uppercase tracking-[0.18em] text-ion">{user.role}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-muted transition-colors hover:text-manara-red">
            <LogOut className="size-3" />Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
