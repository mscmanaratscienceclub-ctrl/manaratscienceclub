"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GraduationCap, FlaskConical, ExternalLink, LogOut, ShieldCheck, PenSquare, HandHeart } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { trackEvent, resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";
import { cn } from "@/lib/utils";

interface SidebarProps { user: { name: string; email: string; role: string } }

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
];
const formItems = [
  { href: "/admin/campus-ambassador", label: "Campus Ambassador", icon: GraduationCap, exact: false },
  { href: "/admin/volunteer", label: "Volunteer", icon: HandHeart, exact: false },
  { href: "/admin/science-competition", label: "Science Competition", icon: FlaskConical, exact: false },
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
      <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", isActive(item.href, item.exact) ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}>
        <item.icon className="size-4 shrink-0" />{item.label}
      </Link>
    ));

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-ink">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-manara-purple"><ShieldCheck className="size-4 text-white" /></div>
        <div>
          <p className="font-display text-sm font-bold leading-none text-white">Grand Admin</p>
          <p className="mt-0.5 text-xs text-white/30">Manarat Science Club</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">{renderLinks(navItems)}</div>

        <p className="mb-1 mt-6 px-3 text-xs font-bold uppercase tracking-widest text-white/25">Form Responses</p>
        <div className="space-y-0.5">{renderLinks(formItems)}</div>

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
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-manara-purple/20 font-display text-xs font-bold text-manara-purple">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/35">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="rounded-full bg-manara-purple/20 px-2 py-0.5 text-xs font-bold capitalize text-manara-purple">{user.role}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-red-400">
            <LogOut className="size-3" />Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
