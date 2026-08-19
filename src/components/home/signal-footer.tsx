import { Camera, Globe, MessageCircle } from "lucide-react";

import { siteConfig } from "@/lib/data";

export default function SignalFooter() {
  return (
    <footer className="border-t border-space-line-soft bg-space-deep text-space-ivory">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-16">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-voyage text-sm font-bold uppercase tracking-[0.3em]">
            MSC<span className="text-ion">//</span>SIGNAL
          </span>
          <span className="hidden h-4 w-px bg-space-line sm:block" aria-hidden="true" />
          <span className="font-space-body text-sm text-space-muted">
            {siteConfig.tagline}. {siteConfig.address}.
          </span>
        </div>

        <div className="flex items-center gap-2.5" aria-label="Social links">
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center border border-ion-line text-space-muted transition-colors hover:border-ion hover:text-ion-bright"
            aria-label="Instagram"
          >
            <Camera className="size-4" />
          </a>
          <a
            href={siteConfig.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center border border-ion-line text-space-muted transition-colors hover:border-ion hover:text-ion-bright"
            aria-label="Facebook"
          >
            <Globe className="size-4" />
          </a>
          <a
            href={siteConfig.social.discord.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center border border-ion-line text-space-muted transition-colors hover:border-ion hover:text-ion-bright"
            aria-label="Discord community"
          >
            <MessageCircle className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
