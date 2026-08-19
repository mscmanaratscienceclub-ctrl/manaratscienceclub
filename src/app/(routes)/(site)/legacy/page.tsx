import { Camera, MessageCircle, GitFork, ExternalLink, Globe, User } from "lucide-react";
import { legacyMembers, currentMembers, nextGenMembers } from "@/lib/data";
import type { Member } from "@/lib/data";
import ScrollReveal from "@/components/animations/ScrollReveal";
import Image from "next/image";

export const metadata = {
  title: "Our Members | Manarat Science Club",
  description: "Meet the past and present members of the Manarat Science Club.",
};

const socialIcons = {
  instagram: Camera,
  facebook: MessageCircle,
  github: GitFork,
  linkedin: ExternalLink,
  website: Globe,
} as const;

function MemberCard({ member }: { member: Member }) {
  return (
    <article className="flex flex-col items-center border border-space-line-soft bg-space-deep/60 p-6 text-center transition-colors hover:border-ion-line">
      <div className="mb-4 flex size-24 items-center justify-center overflow-hidden border border-space-line-soft text-space-muted">
        {member.image ? (
          <Image src={member.image.startsWith('/') || member.image.startsWith('http') ? member.image : `/${member.image}`} alt={member.name} width={96} height={96} className="h-full w-full object-cover" />
        ) : (
          <User className="size-10" />
        )}
      </div>
      <h3 className="font-voyage text-base font-bold uppercase leading-snug tracking-tight text-space-ivory">{member.name}</h3>
      <p className="mt-1 font-mono text-[0.64rem] font-medium uppercase tracking-[0.18em] text-ion">{member.role}</p>
      <p className="mt-1 text-xs text-space-muted">{member.batch}</p>
      {Object.keys(member.socials).length > 0 && (
        <div className="mt-4 flex items-center gap-2.5">
          {Object.entries(member.socials).map(([platform, url]) => {
            const Icon = socialIcons[platform as keyof typeof socialIcons];
            if (!Icon) return null;
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center border border-space-line-soft text-space-muted transition-colors hover:border-ion hover:text-ion-bright"
                aria-label={`${member.name} on ${platform}`}
              >
                <Icon className="size-4" />
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}

function MemberGrid({ members, label, kicker }: { members: Member[]; label: string; kicker: string }) {
  if (members.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
      <div className="mb-10">
        <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">{kicker}</p>
        <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">{label}</h2>
      </div>
      <ScrollReveal stagger={0.05} className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </ScrollReveal>
    </section>
  );
}

export default function LegacyPage() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
          <ScrollReveal>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              {"// 01 — Crew manifest"}
            </p>
            <h1 className="mt-4 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
              Our Members
            </h1>
            <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-space-muted">
              The people who have built and continue to carry the Manarat Science Club forward.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <MemberGrid members={currentMembers} label="Current Members" kicker="// Active roster" />
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16">
        <hr className="border-space-line-soft" />
      </div>
      <MemberGrid members={legacyMembers} label="Legacy Members" kicker="// Founding crews" />
      <MemberGrid members={nextGenMembers} label="2026–2027 Edition" kicker="// Next rotation" />
    </div>
  );
}
