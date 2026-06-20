"use client";

import Link from "next/link";
import { useState } from "react";
import { Atom, Menu, X, Bug, User } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { siteConfig } from "@/lib/data";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/legacy", label: "Legacy" },
  { href: "/achievements", label: "Achievements" },
  { href: "/blogs", label: "Research" },
  { href: "/events", label: "Events" },
  { href: "/opportunities", label: "Opportunities" },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-manara-teal/10 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-manara-teal text-white shadow-subtle">
            <Atom className="size-6" />
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-none tracking-tight text-manara-teal">Manarat</p>
            <p className="font-display text-lg font-semibold leading-none text-ink">Science Club</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 font-display text-sm font-semibold text-ink/70 lg:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-manara-teal">{l.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal transition-colors hover:bg-manara-teal/5 hover:text-manara-teal"
            title={session ? "Profile" : "Sign Up"}
          >
            <User className="size-4" />
          </Link>
          <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 text-xs text-ink/40 transition-colors hover:text-manara-teal">
            <Bug className="size-3.5" />Report a bug
          </a>
          <Link href={session ? "/join" : "/signin?redirect=/join"} className="rounded-full bg-manara-teal px-6 py-2.5 font-display text-sm font-bold text-white shadow-subtle transition hover:-translate-y-0.5 hover:bg-manara-yellow hover:text-manara-teal">
            Join MSC
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal"
            title={session ? "Profile" : "Sign Up"}
          >
            <User className="size-4" />
          </Link>
          <Link href={session ? "/join" : "/signin?redirect=/join"} className="rounded-full bg-manara-teal px-4 py-2 font-display text-xs font-bold text-white">Join</Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-manara-teal/10 text-manara-teal" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-manara-teal/10 bg-white px-5 pb-5 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 font-display text-sm font-semibold text-ink/70 transition-colors hover:bg-manara-teal/5 hover:text-manara-teal">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-manara-teal/10 pt-3">
              <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 px-3 py-2 text-xs text-ink/40"><Bug className="size-3" />Report a bug</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
