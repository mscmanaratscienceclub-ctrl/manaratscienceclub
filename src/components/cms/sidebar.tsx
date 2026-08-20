"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, ExternalLink, LogOut, Atom, PenSquare, Tag, ShieldCheck } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { trackEvent, resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";
import { cn } from "@/lib/utils";

interface SidebarProps { user: { name: string; email: string; role: string } }

const navItems = [
  { href: "/cms", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/cms/posts", label: "Posts", icon: FileText, exact: false },
  { href: "/cms/tags", label: "Tags", icon: Tag, exact: false },
];
const adminItems = [
  { href: "/cms/users", label: "Users", icon: Users, exact: false },
  { href: "/admin", label: "Admin Panel", icon: ShieldCheck, exact: false },
];

export default function CmsSidebar({ user }: SidebarProps) {
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

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-ink">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-manara-teal"><Atom className="size-4 text-white" /></div>
        <div>
          <p className="font-display text-sm font-bold leading-none text-white">MSC Studio</p>
          <p className="mt-0.5 text-xs text-white/30">Content Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", isActive(item.href, item.exact) ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}>
              <item.icon className="size-4 shrink-0" />{item.label}
            </Link>
          ))}
        </div>

        {user.role === "admin" && (
          <>
            <p className="mb-1 mt-6 px-3 text-xs font-bold uppercase tracking-widest text-white/25">Admin</p>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", isActive(item.href, item.exact) ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}>
                  <item.icon className="size-4 shrink-0" />{item.label}
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 space-y-0.5 border-t border-white/8 pt-4">
          <Link href="/cms/posts/new" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-manara-yellow/80 transition-colors hover:bg-white/5 hover:text-manara-yellow">
            <PenSquare className="size-4 shrink-0" />New Post
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <ExternalLink className="size-4 shrink-0" />View Site
          </Link>
        </div>
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-manara-teal/20 font-display text-xs font-bold text-manara-teal">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/35">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="rounded-full bg-manara-teal/20 px-2 py-0.5 text-xs font-bold capitalize text-manara-teal">{user.role}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-red-400">
            <LogOut className="size-3" />Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
