import { legacyMembers, currentMembers, nextGenMembers } from "@/lib/data";
import type { Member } from "@/lib/data";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ChromaGrid, { type ChromaItem } from "@/components/ui/chroma-grid";

export const metadata = {
  title: "Our Members | Manarat Science Club",
  description: "Meet the past and present members of the Manarat Science Club.",
};

const accents = [
  { borderColor: "var(--ion)", gradient: "linear-gradient(165deg, var(--ion), var(--space-black))" },
  { borderColor: "var(--space-amber)", gradient: "linear-gradient(165deg, var(--space-amber), var(--space-black))" },
  { borderColor: "var(--space-sage)", gradient: "linear-gradient(165deg, var(--space-sage), var(--space-black))" },
  { borderColor: "var(--manara-teal-bright)", gradient: "linear-gradient(165deg, var(--manara-teal-bright), var(--space-black))" },
];

function toChromaItem(member: Member, index: number): ChromaItem {
  const accent = accents[index % accents.length];
  const socials = (Object.entries(member.socials) as [string, string | undefined][])
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([platform, url]) => ({ platform, url }));
  const image = member.image
    ? member.image.startsWith("/") || member.image.startsWith("http")
      ? member.image
      : `/${member.image}`
    : undefined;

  return {
    image,
    title: member.name,
    subtitle: member.role,
    handle: member.batch,
    socials,
    ...accent,
  };
}

function MemberGrid({ members, label, kicker }: { members: Member[]; label: string; kicker: string }) {
  if (members.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
      <div className="mb-6">
        <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">{kicker}</p>
        <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">{label}</h2>
      </div>
      <ScrollReveal>
        <ChromaGrid items={members.map(toChromaItem)} columns={3} radius={280} />
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
              01 — Crew manifest
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

      <MemberGrid members={currentMembers} label="Current Members" kicker="Active roster" />
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16">
        <hr className="border-space-line-soft" />
      </div>
      <MemberGrid members={legacyMembers} label="Legacy Members" kicker="Founding crews" />
      <MemberGrid members={nextGenMembers} label="2026–2027 Edition" kicker="Next rotation" />
    </div>
  );
}
