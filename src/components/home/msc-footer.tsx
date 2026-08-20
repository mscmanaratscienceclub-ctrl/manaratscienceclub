import Link from "next/link";
import { Atom, Bug, Camera, Globe, Mail, MapPin, MessageCircle, Phone, Users } from "lucide-react";

import { siteConfig } from "@/lib/data";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "Legacy", href: "/legacy" },
  { label: "Research", href: "/blogs" },
];

const involvedLinks = [
  { label: "Join MSC", href: "/join" },
  { label: "Campus Ambassador", href: "/register" },
  { label: "Report a Bug", href: siteConfig.bugReportUrl },
];

const communityLinks = [
  { label: "Instagram", href: siteConfig.social.instagram, icon: Camera },
  { label: "Facebook", href: siteConfig.social.facebook, icon: Globe },
  { label: "Discord Server", href: siteConfig.social.discord.trim(), icon: MessageCircle },
  { label: "Boys Community", href: siteConfig.social.boysCommunity, icon: Users },
  { label: "Girls Community", href: siteConfig.social.girlsCommunity, icon: Users },
];

const sectionHeading = "font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion";
const footerLink = "font-space-body text-sm text-space-muted transition-colors hover:text-ion-bright";

export default function MscFooter() {
  return (
    <footer className="border-t border-space-line-soft bg-space-deep text-space-ivory">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-8 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + contact */}
          <div className="lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Manarat Science Club home">
              <span className="flex size-10 items-center justify-center border border-ion-line bg-ion-deep/40 transition-colors group-hover:border-ion">
                <Atom className="size-4 text-ion" />
              </span>
              <span className="font-voyage text-sm font-bold uppercase tracking-[0.3em]">
                MSC
              </span>
            </Link>

            <p className="mt-5 max-w-sm font-space-body text-sm leading-relaxed text-space-muted">
              {siteConfig.tagline}. The student-led science society of{" "}
              {siteConfig.address.split(",")[0]}, exploring the universe one experiment at a time.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3 font-space-body text-sm text-space-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ion" aria-hidden="true" />
                {siteConfig.address}
              </li>
              <li>
                <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 font-space-body text-sm text-space-muted transition-colors hover:text-ion-bright">
                  <Mail className="size-4 shrink-0 text-ion" aria-hidden="true" />
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-3 font-space-body text-sm text-space-muted transition-colors hover:text-ion-bright">
                  <Phone className="size-4 shrink-0 text-ion" aria-hidden="true" />
                  {siteConfig.phone}
                </a>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <nav className="lg:col-span-2" aria-label="Explore">
            <h2 className={sectionHeading}>Explore</h2>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Get involved */}
          <nav className="lg:col-span-3" aria-label="Get involved">
            <h2 className={sectionHeading}>Get Involved</h2>
            <ul className="mt-5 space-y-3">
              {involvedLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={footerLink}>
                    {link.label === "Report a Bug" && <Bug className="mr-2 inline size-3.5 text-ion" aria-hidden="true" />}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className={`mt-8 ${sectionHeading}`}>Legal</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <Link href="/privacy-policy" className={footerLink}>Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className={footerLink}>Terms of Service</Link>
              </li>
            </ul>
          </nav>

          {/* Community */}
          <nav className="lg:col-span-3" aria-label="Community">
            <h2 className={sectionHeading}>Community</h2>
            <ul className="mt-5 space-y-3">
              {communityLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 font-space-body text-sm text-space-muted transition-colors hover:text-ion-bright"
                  >
                    <span className="flex size-8 items-center justify-center border border-ion-line transition-colors group-hover:border-ion">
                      <link.icon className="size-3.5" aria-hidden="true" />
                    </span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-space-line-soft">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-16">
          <p className="font-space-body text-xs text-space-muted/70">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved. Est. {siteConfig.foundedYear}.
          </p>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-space-muted/60">
            Developed by <span className="text-ion">{siteConfig.developer}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
