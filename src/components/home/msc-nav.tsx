"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Atom, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Members", href: "/legacy" },
  { label: "Research", href: "/blogs" },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function MscNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const menuDuration = prefersReducedMotion ? 0 : 0.22;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-space-line-soft text-space-ivory transition-colors duration-300",
        scrolled || menuOpen
          ? "bg-space-deep/85 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          : "bg-space-deep"
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-16">
        <Link href="/" className="group flex items-center gap-3" aria-label="Manarat Science Club home">
          <span className="flex size-9 items-center justify-center border border-ion-line bg-ion-deep/40 transition-colors duration-300 group-hover:border-ion">
            <Atom className="size-4 text-ion transition-transform duration-300 group-hover:rotate-90" />
          </span>
          <span className="font-voyage text-sm font-bold uppercase tracking-[0.3em] text-space-ivory transition-colors group-hover:text-ion-bright">
            MSC
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group relative py-2 font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] transition-colors",
                  active ? "text-ion-bright" : "text-space-muted hover:text-space-ivory"
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-px origin-left bg-ion transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <Link
          href="/register"
          className="hidden h-10 items-center gap-2 bg-ion px-5 font-mono text-[0.64rem] font-bold uppercase tracking-[0.24em] text-space-deep transition-colors hover:bg-ion-bright lg:inline-flex"
        >
          Register
          <ArrowRight className="size-3.5" />
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="msc-mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex size-10 items-center justify-center border border-ion-line text-ion transition-colors hover:text-ion-bright lg:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="msc-mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: menuDuration, ease: "easeOut" }}
            className="overflow-hidden border-y border-space-line-soft bg-space-deep/95 backdrop-blur-md lg:hidden"
          >
            <nav
              className="mx-auto flex max-w-[1440px] flex-col px-5 py-4 sm:px-8"
              aria-label="Mobile navigation"
            >
              {navigation.map((item, index) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(
                      "flex items-baseline gap-3 border-b border-space-line-soft py-3.5 font-mono text-xs uppercase tracking-[0.24em] transition-colors hover:text-ion-bright",
                      active ? "text-ion-bright" : "text-space-muted"
                    )}
                  >
                    <span className="text-[0.6rem] text-ion">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/register"
                onClick={closeMenu}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 bg-ion px-5 font-mono text-xs font-bold uppercase tracking-[0.24em] text-space-deep transition-colors hover:bg-ion-bright"
              >
                Register
                <ArrowRight className="size-3.5" />
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
