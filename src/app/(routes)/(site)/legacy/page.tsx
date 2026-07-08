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
    <article className="flex flex-col items-center rounded-[2rem] border border-manara-teal/10 bg-surface p-6 shadow-subtle text-center transition hover:-translate-y-1 hover:shadow-academic">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-manara-teal/10 text-manara-teal mb-4 overflow-hidden">
        {member.image ? (
          <Image src={member.image.startsWith('/') || member.image.startsWith('http') ? member.image : `/${member.image}`} alt={member.name} width={96} height={96} className="h-full w-full object-cover" />
        ) : (
          <User className="h-10 w-10" />
        )}
      </div>
      <h3 className="font-display text-lg font-bold text-ink">{member.name}</h3>
      <p className="mt-1 text-sm font-semibold text-manara-teal">{member.role}</p>
      <p className="mt-0.5 text-xs text-ink/40">{member.batch}</p>
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-ink/50 transition-colors hover:bg-manara-teal hover:text-white"
                aria-label={`${member.name} on ${platform}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}

function MemberGrid({ members, label }: { members: Member[]; label: string }) {
  if (members.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl font-bold text-ink">{label}</h2>
      </div>
      <ScrollReveal>
        <div className="grid gap-6 md:gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

export default function LegacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <ScrollReveal>
        <section className="bg-cream px-4 py-20 text-center border-b border-manara-teal/10">
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            Our Members
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
            The people who have built and continue to carry the Manarat Science Club forward.
          </p>
        </section>
      </ScrollReveal>

      <MemberGrid members={currentMembers} label="Current Members" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <hr className="border-manara-teal/10" />
      </div>
      <MemberGrid members={legacyMembers} label="Legacy Members" />
      <MemberGrid members={nextGenMembers} label="2026–2027 Edition" />
    </div>
  );
}
