"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Atom, Menu, X, Bug, User, Sun, Moon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { siteConfig } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/legacy", label: "Legacy" },
  { href: "/blogs", label: "Research" },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-40 border-b border-manara-teal/10 bg-surface">
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
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal transition-colors hover:bg-manara-teal/5 hover:text-manara-teal"
            title={mounted && theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal transition-colors hover:bg-manara-teal/5 hover:text-manara-teal"
            title={session ? "Profile" : "Sign Up"}
          >
            <User className="size-4" />
          </Link>
          <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 text-xs text-manara-red/60 transition-colors hover:text-manara-red">
            <Bug className="size-3.5" />Report a bug
          </a>
          <Link href="/join" className="rounded-full bg-manara-teal px-6 py-2.5 font-display text-sm font-bold text-white shadow-subtle transition hover:-translate-y-0.5 hover:bg-manara-yellow hover:text-manara-teal">
            Join MSC
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal"
            title={mounted && theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-manara-teal/20 text-manara-teal"
            title={session ? "Profile" : "Sign Up"}
          >
            <User className="size-4" />
          </Link>
          <Link href="/join" className="rounded-full bg-manara-yellow px-4 py-2 font-display text-xs font-bold text-manara-teal">Join</Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-manara-yellow/10 text-manara-yellow" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-manara-teal/10 bg-surface px-5 pb-5 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 font-display text-sm font-semibold text-ink/70 transition-colors hover:bg-manara-teal/5 hover:text-manara-teal">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-manara-teal/10 pt-3">
              <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 px-3 py-2 text-xs text-manara-red/60"><Bug className="size-3" />Report a bug</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
