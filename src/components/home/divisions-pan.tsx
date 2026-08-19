"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { homeCards, type HomeCard } from "@/lib/data/home-cards";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* Minimal line glyphs per division, drawn on by scroll inside the pan. */
function DivisionGlyph({ id }: { id: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    vectorEffect: "non-scaling-stroke",
  } as const;

  switch (id) {
    case "team-robotics":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <path data-glyph-path {...common} d="M8 32 H22 M42 32 H56" />
          <rect data-glyph-path {...common} x="22" y="20" width="20" height="24" />
          <circle data-glyph-path {...common} cx="32" cy="32" r="5" />
          <path data-glyph-path {...common} d="M32 20 V10 M32 44 V54" />
        </svg>
      );
    case "team-research":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <path data-glyph-path {...common} d="M14 14 H50 M14 24 H50 M14 34 H42 M14 44 H34" />
          <path data-glyph-path {...common} d="M44 52 L54 42" />
        </svg>
      );
    case "team-astronomy":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <circle data-glyph-path {...common} cx="32" cy="32" r="8" />
          <ellipse data-glyph-path {...common} cx="32" cy="32" rx="26" ry="11" />
          <circle cx="56" cy="26" r="2" fill="currentColor" />
        </svg>
      );
    case "team-chemistry":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <path data-glyph-path {...common} d="M26 8 H38 M28 8 V26 L14 50 A4 4 0 0 0 17.5 56 H46.5 A4 4 0 0 0 50 50 L36 26 V8" />
          <path data-glyph-path {...common} d="M20 44 H44" />
        </svg>
      );
    case "team-biology":
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <path data-glyph-path {...common} d="M22 6 C22 22 42 26 42 42 C42 50 36 56 32 58 C28 56 22 50 22 42 C22 26 42 22 42 6" />
          <path data-glyph-path {...common} d="M24 16 H40 M24 48 H40 M28 32 H36" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="size-14 text-ion" aria-hidden="true">
          <rect data-glyph-path {...common} x="10" y="10" width="18" height="26" />
          <rect data-glyph-path {...common} x="36" y="10" width="18" height="12" />
          <rect data-glyph-path {...common} x="36" y="30" width="18" height="24" />
          <rect data-glyph-path {...common} x="10" y="44" width="18" height="10" />
        </svg>
      );
  }
}

function DivisionPanel({ card }: { card: HomeCard }) {
  return (
    <article className="flex h-[min(560px,72dvh)] w-[84vw] flex-col justify-between border border-space-line bg-ion-deep/60 p-7 sm:w-[46vw] sm:p-9 lg:w-[34vw]">
      <div data-panel-content>
        <div className="flex items-start justify-between">
          <DivisionGlyph id={card.id} />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-space-muted">
            {card.memberCount} crew
          </span>
        </div>
        <h3 className="mt-7 font-voyage text-xl font-medium uppercase leading-snug tracking-tight text-space-ivory sm:text-2xl">
          {card.title}
        </h3>
        <p className="mt-4 font-space-body text-sm leading-6 text-space-muted sm:text-[0.95rem] sm:leading-7">
          {card.description}
        </p>
      </div>
      <ul className="mt-6 flex flex-wrap gap-2">
        {card.focus.slice(0, 3).map((item) => (
          <li
            key={item}
            className="border border-space-line-soft px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-space-ivory/75"
          >
            {item}
          </li>
        ))}
        {card.openPositions > 0 ? (
          <li className="border border-ion px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-ion-bright">
            {card.openPositions} open seats
          </li>
        ) : null}
      </ul>
    </article>
  );
}

export default function DivisionsPan() {
  const wrapRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRailRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (reducedMotion || !wrap || !track) return;

    const ctx = gsap.context(() => {
      const getDistance = () => track.scrollWidth - window.innerWidth;

      const pan = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: () => `+=${getDistance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRailRef.current) {
              progressRailRef.current.style.transform = `scaleX(${Math.max(self.progress, 0.02)})`;
            }
          },
        },
      });

      /* Each card's glyph draws itself as the panel enters the pan. */
      gsap.utils.toArray<HTMLElement>("[data-division-panel]").forEach((panel) => {
        const paths = panel.querySelectorAll<SVGPathElement | SVGCircleElement | SVGEllipseElement | SVGRectElement>("[data-glyph-path]");
        paths.forEach((path) => {
          let length = 200;
          try {
            length = (path as SVGGeometryElement).getTotalLength();
          } catch {
            /* keep fallback length */
          }
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1,
            ease: "none",
            scrollTrigger: {
              containerAnimation: pan,
              trigger: panel,
              start: "left 92%",
              end: "left 45%",
              scrub: true,
            },
          });
        });

        gsap.from(panel.querySelector("[data-panel-content]"), {
          opacity: 0,
          y: 26,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            containerAnimation: pan,
            trigger: panel,
            start: "left 85%",
            once: true,
          },
        });
      });
    }, wrap);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section id="divisions" ref={wrapRef} className="relative overflow-hidden bg-space-deep">
      <div ref={trackRef} className="flex h-[100dvh] items-center will-change-transform">
        <div className="flex w-[86vw] shrink-0 flex-col justify-center pl-5 sm:w-[42vw] sm:pl-8 lg:w-[32vw] lg:pl-16">
          <h2 className="font-voyage text-4xl font-bold uppercase leading-[1.06] tracking-tight text-space-ivory sm:text-5xl lg:text-6xl">
            THE<br />
            <span className="text-ion-bright">FLEET</span>
          </h2>
          <p className="mt-6 max-w-[24rem] font-space-body text-base leading-7 text-space-muted">
            Six divisions, each with its own lab bench, calendar, and crew.
            Keep scrolling to walk the line.
          </p>
        </div>

        {homeCards.map((card) => (
          <div key={card.id} data-division-panel className="shrink-0 px-3 sm:px-5">
            <DivisionPanel card={card} />
          </div>
        ))}

        <div className="flex w-[86vw] shrink-0 flex-col justify-center pl-6 pr-5 sm:w-[42vw] lg:w-[32vw] lg:pr-16">
          <p className="font-voyage text-3xl font-bold uppercase leading-tight tracking-tight text-space-ivory sm:text-4xl">
            READY TO<br />
            <span className="text-ion-bright">BOARD?</span>
          </p>
          <p className="mt-5 max-w-[22rem] font-space-body text-base leading-7 text-space-muted">
            Seats open every semester. Bring a question, leave with a program.
          </p>
          <Link
            href="/join"
            className="mt-8 inline-flex h-12 w-max items-center justify-center bg-ion px-8 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-space-deep transition-colors duration-300 hover:bg-ion-bright"
          >
            Join MSC
          </Link>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-space-line-soft"
        aria-hidden="true"
      >
        <div
          ref={progressRailRef}
          className="h-px origin-left scale-x-0 bg-ion"
        />
      </div>
    </section>
  );
}
