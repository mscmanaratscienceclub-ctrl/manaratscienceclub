import Link from "next/link";
import { Users, Camera, Presentation, Code2, Lightbulb, ChevronRight } from "lucide-react";

interface Role {
  title: string;
}

interface Committee {
  name: string;
  url: string;
  border: string;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  icon: React.ReactNode;
  roles: Role[];
}

const COMMITTEES: Committee[] = [
  {
    name: "Executives",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSeuPwt3kv3jMuHF0yDtyOyxVPSLTGgjgaBVH3IgHEahNda7Mg/viewform",
    border: "border-manara-red/10",
    iconBg: "bg-manara-red/10",
    iconColor: "text-manara-red",
    btnBg: "bg-manara-red",
    icon: <Users className="h-6 w-6" />,
    roles: [
      {
        title: "2 Vice Presidents (Male & Female)",
      },
      {
        title: "2 Assistant Secretary (Male & Female)",
      },
      {
        title: "Coordinator",
      },
    ],
  },
  {
    name: "Media Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSd2OVlBXwdTk-19jX3sfy5ZfUvd8MzGpQ54HaWDSsz6lzUx6g/viewform",
    border: "border-manara-purple/10",
    iconBg: "bg-manara-purple/10",
    iconColor: "text-manara-purple",
    btnBg: "bg-manara-purple",
    icon: <Camera className="h-6 w-6" />,
    roles: [
      {
        title: "Chief Media Manager",
      },
      {
        title: "Lead Content Strategist",
      },
      {
        title: "Video Editor",
      },
    ],
  },
  {
    name: "Activity Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfvCcLV3zJKg7y5tKIuUgho5ulFRGrqOfb6Qe9xHQPRACZ9Tw/viewform",
    border: "border-manara-yellow/10",
    iconBg: "bg-manara-yellow/10",
    iconColor: "text-manara-yellow",
    btnBg: "bg-manara-yellow",
    icon: <Presentation className="h-6 w-6" />,
    roles: [
      {
        title: "Chief Anchor (Physical)",
      },
      {
        title: "Deputy Anchor",
      },
      {
        title: "Activity Manager",
      },
      {
        title: "Project Strategist / Manager",
      },
      {
        title: "Chief Auditor",
      },
    ],
  },
  {
    name: "IT Department",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdL-tr1Bcs4yNyYdg1gOEqk1Yyxo-5emLlSMv5UnG1knOi56Q/viewform",
    border: "border-manara-blue/10",
    iconBg: "bg-manara-blue/10",
    iconColor: "text-manara-blue",
    btnBg: "bg-manara-blue",
    icon: <Code2 className="h-6 w-6" />,
    roles: [
      {
        title: "Discord Moderator",
      },
      {
        title: "Website Developer / Maintainer",
      },
      {
        title: "Other Activities",
      },
    ],
  },
  {
    name: "Engineering & Innovation",
    url: "https://forms.gle/bNMbWtMBSh7irgqw5",
    border: "border-manara-pink/10",
    iconBg: "bg-manara-pink/10",
    iconColor: "text-manara-pink",
    btnBg: "bg-manara-pink",
    icon: <Lightbulb className="h-6 w-6" />,
    roles: [
      { title: "Robotics & Automation Lead" },
      { title: "Electronics & Circuit Design Lead" },
      { title: "Research & Development (R&D) Lead" },
      { title: "Project Development Officer" },
      { title: "Innovation Strategist" },
      { title: "Workshop & Training Coordinator" },
      { title: "Technical Documentation Manager" },
    ],
  },
];

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="bg-cream px-4 py-16 text-center border-b border-manara-teal/10">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Join Manarat Science Club
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-base text-ink/60">
          Pick a department, review the open roles, and apply.
        </p>
      </section>

      {/* Committees */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {COMMITTEES.map((committee) => (
            <article
              key={committee.name}
              className="flex flex-col rounded-[2rem] bg-surface shadow-subtle overflow-hidden border border-manara-teal/10"
            >
              {/* Colored Header */}
              <div className={`${committee.btnBg} px-6 py-5`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                    {committee.icon}
                  </div>
                  <h2 className="font-display text-lg font-bold text-white">
                    {committee.name}
                  </h2>
                </div>
              </div>

              {/* Roles */}
              <div className="flex-1 space-y-1 px-6 py-5">
                {committee.roles.map((role) => (
                  <div
                    key={role.title}
                    className="flex items-start gap-3 py-2"
                  >
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${committee.btnBg}`} />
                    <h3 className="font-display text-sm font-semibold text-ink leading-snug">
                      {role.title}
                    </h3>
                  </div>
                ))}
              </div>

              {/* Apply */}
              <div className="px-6 pb-6">
                <Link
                  href={committee.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-1.5 w-full rounded-xl ${committee.btnBg} px-4 py-2.5 font-display text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90`}
                >
                  Apply now
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
