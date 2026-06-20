import Link from "next/link";
import { MapPin, Mail, Phone, Camera, Globe, MessageCircle, Users } from "lucide-react";
import { siteConfig } from "@/lib/data";

const explorationLinks = [
  { href: "/", label: "Home" }, { href: "/legacy", label: "Institutional Legacy" },
  { href: "/achievements", label: "Achievements & Accolades" }, { href: "/blogs", label: "Research Hub" },
  { href: "/events", label: "Events Calendar" }, { href: "/opportunities", label: "Teams & Projects" },
  { href: "/join", label: "Join MSC" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-manara-teal/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-teal">Contact</p>
            <ul className="mt-6 space-y-4 text-sm text-ink/70">
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-manara-teal" /><span>{siteConfig.address}</span></li>
              <li className="flex items-center gap-3"><Mail className="size-4 shrink-0 text-manara-teal" /><a href={`mailto:${siteConfig.email}`} className="hover:text-manara-teal transition-colors">{siteConfig.email}</a></li>
              <li className="flex items-center gap-3"><Phone className="size-4 shrink-0 text-manara-teal" /><a href={`tel:${siteConfig.phone}`} className="hover:text-manara-teal transition-colors">{siteConfig.phone}</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-teal">Explore</p>
            <ul className="mt-6 space-y-3">
              {explorationLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-ink/70 hover:text-manara-teal transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-widest text-manara-teal">Community</p>
            <ul className="mt-6 space-y-4">
              <li><a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-ink/70 hover:text-manara-pink transition-colors"><Camera className="size-4" />Instagram</a></li>
              <li><a href={siteConfig.social.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-ink/70 hover:text-manara-purple transition-colors"><MessageCircle className="size-4" />Discord Server</a></li>
              <li><a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-ink/70 hover:text-manara-blue transition-colors"><Globe className="size-4" />Facebook Page</a></li>
              <li className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Community Groups</li>
              <li><a href={siteConfig.social.boysCommunity} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-ink/70 hover:text-manara-teal transition-colors"><Users className="size-4" />Brothers Group</a></li>
              <li><a href={siteConfig.social.girlsCommunity} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-ink/70 hover:text-manara-pink transition-colors"><Users className="size-4" />Sisters Group</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-manara-teal/10 pt-8 text-xs text-ink/40 sm:flex-row sm:items-center">
          <p>&copy; {year} Manarat Science Club — Manarat Dhaka International School & College. All rights reserved.</p>
          <p>Designed & built by <span className="font-semibold text-manara-teal">{siteConfig.developer}</span></p>
        </div>
      </div>
    </footer>
  );
}
