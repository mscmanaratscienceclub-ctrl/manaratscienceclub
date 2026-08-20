import Link from "next/link";
import { Camera, Presentation, Code2, Lightbulb, ChevronRight, Palette, BookOpen } from "lucide-react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface Committee {
  name: string;
  url: string;
  icon: React.ReactNode;
  iconClass: string;
  dotClass: string;
  roles: { title: string }[];
}

const COMMITTEES: Committee[] = [
  {
    name: "Activity Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfvCcLV3zJKg7y5tKIuUgho5ulFRGrqOfb6Qe9xHQPRACZ9Tw/viewform",
    icon: <Presentation className="size-6" />,
    iconClass: "text-ion border-ion-line",
    dotClass: "bg-ion",
    roles: [
      { title: "Chief Anchor (Physical)" },
      { title: "Deputy Anchor" },
      { title: "Activity Manager" },
      { title: "Project Strategist / Manager" },
      { title: "Chief Auditor" },
    ],
  },
  {
    name: "Creative Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScjS4FdPNi03ZcD1ipfh6dP5CU2gjCTy-roqb-ACeiolawE2w/viewform",
    icon: <Palette className="size-6" />,
    iconClass: "text-space-amber border-space-amber/30",
    dotClass: "bg-space-amber",
    roles: [
      { title: "Lead Graphic Designer" },
      { title: "Deputy Graphic Designer" },
      { title: "Canvas Artist" },
    ],
  },
  {
    name: "Media Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSd2OVlBXwdTk-19jX3sfy5ZfUvd8MzGpQ54HaWDSsz6lzUx6g/viewform",
    icon: <Camera className="size-6" />,
    iconClass: "text-ion-bright border-ion-line",
    dotClass: "bg-ion-bright",
    roles: [
      { title: "Chief Media Manager" },
      { title: "Lead Content Strategist" },
      { title: "Video Editor" },
    ],
  },
  {
    name: "IT Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdL-tr1Bcs4yNyYdg1gOEqk1Yyxo-5emLlSMv5UnG1knOi56Q/viewform",
    icon: <Code2 className="size-6" />,
    iconClass: "text-space-sage border-space-sage/30",
    dotClass: "bg-space-sage",
    roles: [
      { title: "Discord Moderator" },
      { title: "Website Developer / Maintainer" },
      { title: "Other Activities" },
    ],
  },
  {
    name: "Engineering & Innovation",
    url: "https://forms.gle/bNMbWtMBSh7irgqw5",
    icon: <Lightbulb className="size-6" />,
    iconClass: "text-space-amber-bright border-space-amber/30",
    dotClass: "bg-space-amber-bright",
    roles: [
      { title: "Robotics & Automation Lead" },
      { title: "Electronics & Circuit Design Lead" },
      { title: "Research & Development (R&D) Lead" },
      { title: "Project Development Officer" },
      { title: "Innovation Strategist" },
      { title: "Workshop & Training Coordinator" },
      { title: "Technical Documentation Manager" },
      { title: "General Engineering Member" },
    ],
  },
  {
    name: "Academic Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfzSz9LhnBSbiIEO_eJwS3I69joXj2XYvHxUDb0Hyf8ZSP9tg/viewform?usp=header",
    icon: <BookOpen className="size-6" />,
    iconClass: "text-space-ivory border-space-line",
    dotClass: "bg-space-ivory",
    roles: [
      { title: "Chief Editor" },
      { title: "Deputy Editor" },
      { title: "Lead Researcher" },
      { title: "Deputy Researcher" },
      { title: "Curriculum Developer" },
    ],
  },
];

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            {"01 — Enlist"}
          </p>
          <h1 className="mt-4 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Join Manarat Science Club
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-space-muted">
            Pick a department, review the open roles, and apply.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <ScrollReveal stagger={0.07} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COMMITTEES.map((committee, index) => (
            <article
              key={committee.name}
              className="flex flex-col border border-space-line-soft bg-space-deep/60 transition-colors hover:border-ion-line"
            >
              <div className="border-b border-space-line-soft px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center border ${committee.iconClass}`}>
                    {committee.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.24em] text-space-muted">
                      {`0${index + 1}`}
                    </p>
                    <h2 className="font-voyage text-base font-bold uppercase leading-snug tracking-tight text-space-ivory">
                      {committee.name}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-1 px-6 py-5">
                {committee.roles.map((role) => (
                  <div key={role.title} className="flex items-start gap-3 py-1.5">
                    <div className={`mt-1.5 size-1.5 shrink-0 ${committee.dotClass}`} />
                    <h3 className="text-sm font-medium leading-snug text-space-ivory/85">{role.title}</h3>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                <Link
                  href={committee.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msc-btn-ghost w-full"
                >
                  Apply now
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </ScrollReveal>
      </section>
    </main>
  );
}
