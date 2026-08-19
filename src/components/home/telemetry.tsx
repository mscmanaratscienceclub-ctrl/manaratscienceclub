"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { metrics } from "@/lib/data";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const READINGS = [
  { label: "Members", value: metrics.members, suffix: "" },
  { label: "Divisions", value: metrics.activeTeams, suffix: "" },
  { label: "Projects", value: metrics.completedProjects, suffix: "" },
  { label: "Accolades", value: metrics.accolades, suffix: "" },
];

const MISSION_QUEUE = [
  "Complete Phase 1 of the Radio Telescope Array",
  "Publish Volume 5 of the MSC Research Journal",
  "Move the vertical farm to a rooftop installation",
  "Host the first inter-school MSC Science Symposium",
  "Stand up an alumni mentorship network",
];

export default function Telemetry() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (reducedMotion || !section) return;

    const ctx = gsap.context(() => {
      section.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count ?? "0");
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          snap: { value: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            once: true,
          },
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value));
          },
        });
      });

      gsap.to("[data-radar-sweep]", {
        rotation: 360,
        transformOrigin: "50% 50%",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.from("[data-queue-row]", {
        opacity: 0,
        x: 32,
        duration: 0.65,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-queue]",
          start: "top 75%",
          once: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} id="mission" className="relative overflow-hidden bg-ion-deep">
      <div className="mx-auto grid w-full max-w-[1440px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:py-36 lg:px-16">
        <div className="relative">
          <div className="mx-auto w-full max-w-[420px]" aria-hidden="true">
            <svg viewBox="0 0 400 400" className="block w-full">
              {[60, 110, 160, 195].map((r) => (
                <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--ion-line)" strokeWidth="1" />
              ))}
              <path d="M200 5 V395 M5 200 H395" stroke="var(--ion-line)" strokeWidth="1" />
              <g data-radar-sweep>
                <path d="M200 200 L200 5 A195 195 0 0 1 310 37 Z" fill="var(--ion)" opacity="0.14" />
                <path d="M200 200 L200 5" stroke="var(--ion)" strokeWidth="1.5" />
              </g>
              <circle cx="262" cy="132" r="3" fill="var(--ion-bright)" />
              <circle cx="148" cy="268" r="3" fill="var(--ion-bright)" />
              <circle cx="298" cy="242" r="2.5" fill="var(--ion-bright)" opacity="0.7" />
            </svg>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-x-10 gap-y-9 sm:grid-cols-4 lg:mt-14">
            {READINGS.map((reading) => (
              <div key={reading.label}>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-space-muted">
                  {reading.label}
                </dt>
                <dd className="mt-2 font-voyage text-3xl font-bold text-ion-bright sm:text-4xl">
                  <span data-count={reading.value}>0</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-queue>
          <h2 className="font-voyage text-3xl font-bold uppercase leading-tight tracking-tight text-space-ivory sm:text-4xl">
            MISSION <span className="text-ion-bright">QUEUE</span>
          </h2>
          <p className="mt-4 max-w-[30rem] font-space-body text-base leading-7 text-space-muted">
            The roadmap toward 2027, exactly as the club filed it.
          </p>

          <ol className="mt-10 space-y-0">
            {MISSION_QUEUE.map((mission, index) => (
              <li
                key={mission}
                data-queue-row
                className="group flex items-baseline gap-5 border-t border-space-line-soft py-5 last:border-b"
              >
                <span className="font-mono text-[0.66rem] tracking-[0.2em] text-ion">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-space-body text-base leading-6 text-space-ivory/90 transition-colors duration-300 group-hover:text-ion-bright sm:text-lg">
                  {mission}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
