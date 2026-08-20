import ScrollReveal from "@/components/animations/ScrollReveal";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

interface LegalShellProps {
  kicker: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalShell({ kicker, title, updated, intro, sections }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[900px] px-5 py-20 sm:px-8">
          <ScrollReveal>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">{kicker}</p>
            <h1 className="mt-3 font-voyage text-3xl font-bold uppercase tracking-tight text-space-ivory lg:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-space-muted">{intro}</p>
            <p className="mt-6 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-space-muted/70">
              Last updated: {updated}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[900px] px-5 py-14 sm:px-8">
        <div className="space-y-12">
          {sections.map((section, index) => (
            <article key={section.heading}>
              <h2 className="font-voyage text-base font-bold uppercase tracking-tight text-space-ivory">
                <span className="mr-3 font-mono text-xs font-medium text-ion">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-space-muted">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-space-muted">
                      <span aria-hidden="true" className="mt-[0.55em] size-1 shrink-0 bg-ion" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
