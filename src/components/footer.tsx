import Link from "next/link";
import { MapPin, Mail, Phone, Camera, Globe, MessageCircle, Users, Microscope } from "lucide-react";
import { siteConfig } from "@/lib/data";

const explorationLinks = [
  { href: "/", label: "Home" }, { href: "/legacy", label: "Past and Current Members" },
 { href: "/blogs", label: "Articles" },
  { href: "/join", label: "Join MSC" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-footer">
      {/* Top accent line */}
      <div className="h-1 w-full bg-footer-accent" />

      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {/* Brand row */}
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Microscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-base font-bold text-white">Manarat Science Club</p>
            <p className="text-xs text-white/45">Manarat Dhaka International School & College</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Contact */}
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-yellow">Contact</p>
            <ul className="mt-6 space-y-4 text-sm text-white/65">
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-manara-yellow" /><span>{siteConfig.address}</span></li>
              <li className="flex items-center gap-3"><Mail className="size-4 shrink-0 text-manara-yellow" /><a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-manara-yellow">{siteConfig.email}</a></li>
              <li className="flex items-center gap-3"><Phone className="size-4 shrink-0 text-manara-yellow" /><a href={`tel:${siteConfig.phone}`} className="transition-colors hover:text-manara-yellow">{siteConfig.phone}</a></li>
            </ul>
          </div>

          {/* Explore */}
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-yellow">Explore</p>
            <ul className="mt-6 space-y-3">
              {explorationLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-white/65 transition-colors hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-yellow">Community</p>
            <ul className="mt-6 space-y-4">
              <li><a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/65 transition-colors hover:text-manara-pink"><Camera className="size-4" />Instagram</a></li>
              <li><a href={siteConfig.social.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/65 transition-colors hover:text-manara-purple"><MessageCircle className="size-4" />Discord Server</a></li>
              <li><a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/65 transition-colors hover:text-white"><Globe className="size-4" />Facebook Page</a></li>
              <li className="pt-2 text-xs font-semibold uppercase tracking-wide text-white/30">Community Groups</li>
              <li><a href={siteConfig.social.boysCommunity} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/65 transition-colors hover:text-manara-yellow"><Users className="size-4" />Boys Group</a></li>
              <li><a href={siteConfig.social.girlsCommunity} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/65 transition-colors hover:text-manara-pink"><Users className="size-4" />Girls Group</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center">
            <p className="text-white/35">&copy; {year} Manarat Science Club. All rights reserved.</p>
            <p className="text-white/35">Designed &amp; built by <span className="font-semibold text-manara-yellow">{siteConfig.developer}</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
