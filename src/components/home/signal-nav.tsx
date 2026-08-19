"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const homeNavigation = [
  { label: "Fleet", href: "#divisions" },
  { label: "Mission", href: "#mission" },
  { label: "Journal", href: "#journal" },
  { label: "Research", href: "/blogs" },
];

const siteNavigation = [
  { label: "Home", href: "/" },
  { label: "Legacy", href: "/legacy" },
  { label: "Research", href: "/blogs" },
  { label: "Events", href: "/events" },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type SignalNavProps = {
  /** "overlay" floats above the home hero; "bar" is the sticky chrome for every other page. */
  variant?: "overlay" | "bar";
};

export default function SignalNav({ variant = "overlay" }: SignalNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const links = variant === "bar" ? siteNavigation : homeNavigation;
  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        "z-50 text-space-ivory",
        variant === "bar"
          ? "sticky top-0 border-b border-space-line-soft bg-space-deep"
          : "absolute inset-x-0 top-0",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-16">
        <Link
          href="/"
          className="font-voyage text-sm font-bold uppercase tracking-[0.3em] text-space-ivory transition-colors hover:text-ion-bright"
        >
          MSC<span className="text-ion">//</span>SIGNAL
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] transition-colors hover:text-ion-bright",
                variant === "bar" && isActive(item.href, pathname) ? "text-ion-bright" : "text-space-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/join"
          className="hidden h-10 items-center gap-2 border border-ion-line px-5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion transition-colors hover:border-ion hover:text-ion-bright lg:inline-flex"
        >
          Join MSC
          <ArrowRight className="size-3.5" />
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="signal-mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex size-10 items-center justify-center border border-ion-line text-ion transition-colors hover:text-ion-bright lg:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="signal-mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-y border-space-line-soft bg-space-deep/95 backdrop-blur-md lg:hidden"
          >
            <nav className="mx-auto flex max-w-[1440px] flex-col px-5 py-4 sm:px-8" aria-label="Mobile navigation">
              {links.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "border-b border-space-line-soft py-3 font-mono text-xs uppercase tracking-[0.24em]",
                    "transition-colors hover:text-ion-bright",
                    variant === "bar" && isActive(item.href, pathname) ? "text-ion-bright" : "text-space-muted",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/join"
                onClick={closeMenu}
                className="mt-4 inline-flex items-center gap-2 self-start font-mono text-xs uppercase tracking-[0.24em] text-ion-bright"
              >
                Join MSC
                <ArrowRight className="size-3.5" />
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
