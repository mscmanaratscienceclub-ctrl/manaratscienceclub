"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const LINES = [
  "SCIENCE SHOULD NOT BE",
  "CONFINED TO TEXTBOOK ONLY.",
  "STUDENTS SHOULD HAVE",
  "THE FREEDOM TO EXPLORE",
  "AND EXPRESS THEIR CREATIVITY",
  "WITH ENOUGH OPPORTUNITIES.",
];

/* The club philosophy as a pinned transmission: each line decodes upward out
   of a mask as you scroll, one after another. */
export default function ManifestoLines() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (reducedMotion || !section) return;

    const ctx = gsap.context(() => {
      const lines = Array.from(section.querySelectorAll<HTMLElement>("[data-line]"));
      lines.forEach((line) => {
        gsap.set(line.querySelector("[data-line-inner]"), { yPercent: 100 });
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${LINES.length * 55}%`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      lines.forEach((line, index) => {
        timeline.to(
          line.querySelector("[data-line-inner]"),
          { yPercent: 0, duration: 1, ease: "power2.out" },
          index * 0.7,
        );
        timeline.to(
          line,
          { opacity: 1, duration: 0.6 },
          "<",
        );
        if (index > 0) {
          timeline.to(lines[index - 1], { opacity: 0.28, duration: 0.6 }, "<");
        }
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-space-deep"
    >
      <div className="space-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-8 lg:px-16">
        <div className="max-w-[76rem]">
          {LINES.map((line, index) => (
            <p
              key={line}
              data-line
              className={`overflow-hidden font-voyage text-[1.9rem] font-semibold uppercase leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.8rem] ${
                index % 2 === 0 ? "text-space-ivory" : "text-ion"
              } ${reducedMotion ? "" : "opacity-30"}`}
            >
              <span data-line-inner className="block">
                {line}
              </span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
