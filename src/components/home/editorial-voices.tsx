import ScrollReveal from "@/components/animations/ScrollReveal";
import { leadership } from "@/lib/data";

const advisors = leadership.filter((member) => member.role === "faculty-advisor");

function initialsOf(name: string) {
  return name
    .replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EditorialVoices() {
  return (
    <section id="editorial" className="border-t border-space-line-soft bg-ion-deep">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
        <ScrollReveal className="max-w-[44rem]">
          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            Editorial
          </p>
          <h2 className="mt-4 font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Words of wisdom from our <span className="text-ion-bright">faculty advisors</span>
          </h2>
          <p className="mt-5 max-w-[34rem] font-space-body text-base leading-7 text-space-muted">
            Dedicated educators and mentors steering MSC toward scientific integrity.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {advisors.map((advisor) => (
            <ScrollReveal key={advisor.id}>
              <article className="flex h-full flex-col border border-space-line-soft bg-space-deep/70 p-8 backdrop-blur-sm transition-colors duration-300 hover:border-ion-line sm:p-10">
                <div className="flex items-center gap-5">
                  <span
                    aria-hidden="true"
                    className="flex size-16 shrink-0 items-center justify-center border border-ion-line bg-ion-deep font-voyage text-lg font-bold text-ion"
                  >
                    {initialsOf(advisor.name)}
                  </span>
                  <div>
                    <h3 className="font-voyage text-lg font-bold tracking-tight text-space-ivory">
                      {advisor.name}
                    </h3>
                    <p className="mt-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.22em] text-ion">
                      {advisor.designation}
                    </p>
                  </div>
                </div>

                <p className="mt-7 flex-1 font-space-body text-base leading-8 text-space-ivory/85">
                  <span aria-hidden="true" className="mr-1 font-voyage text-2xl text-ion">
                    &ldquo;
                  </span>
                  {advisor.quote}
                  <span aria-hidden="true" className="ml-1 font-voyage text-2xl text-ion">
                    &rdquo;
                  </span>
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
