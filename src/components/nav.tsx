"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Bug, User } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { siteConfig } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/legacy", label: "Legacy" },
  { href: "/blogs", label: "Research" },
];

function isActiveLink(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0, visible: false });

  const activeIndex = navLinks.findIndex((l) => isActiveLink(l.href, pathname));

  useEffect(() => {
    if (activeIndex === -1 || !navRef.current) {
      setUnderline((u) => ({ ...u, visible: false }));
      return;
    }
    const links = navRef.current.querySelectorAll<HTMLAnchorElement>("a");
    const el = links[activeIndex];
    if (el) {
      setUnderline({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    }
  }, [activeIndex]);

  return (
    <header className="sticky top-0 z-40 bg-manara-teal shadow-academic">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/msc.svg" alt="MSC" className="h-9 w-9" />
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight text-white">Manarat</p>
            <p className="font-display text-base font-semibold leading-none text-white">Science Club</p>
          </div>
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-7 font-display text-sm font-semibold lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "transition-colors hover:text-white",
                isActiveLink(l.href, pathname) ? "text-white" : "text-white/70",
              )}
            >
              {l.label}
            </Link>
          ))}
          <motion.div
            className="absolute -bottom-1 left-0 h-0.5 rounded-full bg-manara-yellow"
            animate={{
              left: underline.left,
              width: underline.width,
              opacity: underline.visible ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 hover:text-white"
            title={session ? "Profile" : "Sign Up"}
          >
            <User className="size-4" />
          </Link>
          <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 text-xs text-white transition-colors hover:text-white">
            <Bug className="size-3.5" />Report a bug
          </a>
          <Link href="/join" className="rounded-full bg-manara-yellow px-6 py-2.5 font-display text-sm font-bold text-manara-teal shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
            Join MSC
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={session ? "/profile" : "/signup"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white"
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
        <div className="border-t border-white/10 bg-manara-teal px-5 pb-5 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2.5 font-display text-sm font-semibold transition-colors hover:bg-white/10 hover:text-white",
                  isActiveLink(l.href, pathname) ? "bg-white/10 text-white" : "text-white/60",
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-white/10 pt-3">
              <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 px-3 py-2 text-xs text-white"><Bug className="size-3" />Report a bug</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
