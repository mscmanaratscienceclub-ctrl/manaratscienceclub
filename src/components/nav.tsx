"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Bug } from "lucide-react";
import { siteConfig } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

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
          <Image src="/msc.svg" alt="MSC" width={36} height={36} priority className="h-9 w-9" />
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
          <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 text-xs text-white transition-colors hover:text-white">
            <Bug className="size-3.5" />Report a bug
          </a>
          <Link href="/join" className="rounded-full bg-manara-yellow px-6 py-2.5 font-display text-sm font-bold text-manara-teal shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
            Join MSC
          </Link>
        </div>

        <div className="flex items-center lg:hidden">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-manara-yellow/10 text-manara-yellow transition-transform active:scale-90" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/10 bg-manara-teal lg:hidden"
          >
            <div className="px-5 pb-6 pt-4">
              <nav className="flex flex-col gap-1.5">
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

                <div className="mt-4">
                  <Link
                    href="/join"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl bg-manara-yellow px-4 py-3 font-display text-sm font-bold text-manara-teal shadow-subtle transition active:scale-95"
                  >
                    Join MSC
                  </Link>
                </div>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <a href={siteConfig.bugReportUrl} className="flex items-center gap-1.5 px-3 py-2 text-xs text-white/60 transition-colors hover:text-white"><Bug className="size-3" />Report a bug</a>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
