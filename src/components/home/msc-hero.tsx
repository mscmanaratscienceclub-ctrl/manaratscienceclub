"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import TesseractCanvas from "@/components/home/tesseract-canvas";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { metrics } from "@/lib/data";
import { stemfestSegments } from "@/lib/data/stemfest";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function MscHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    /* Also check the media query directly: `useReducedMotion` syncs in a
       post-paint effect, so its state is still `false` during this first
       layout pass and a reduce-motion visitor would get one GSAP-driven
       flash before the hook catches up. */
    if (
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    /* Defense-in-depth: the pre-paint script in layout.tsx already set
       this, but a framework re-render can reconcile <html> attributes
       and drop it — re-assert before GSAP initializes so the gate rules
       in globals.css are guaranteed to be in force (idempotent). */
    document.documentElement.classList.add("motion-ok");

    const ctx = gsap.context(() => {
      /* Gentle intro: eyebrow and headline lines drift up softly, then
         subtext, CTAs and the metrics line follow. */
      const intro = gsap.timeline({ defaults: { ease: "power2.out" } });

      /* fromTo, not from: these elements start hidden by the
         `html.motion-ok` gate rules in globals.css, so a plain `from`
         would read opacity 0 as the END value and nothing would appear. */
      intro.fromTo(
        "[data-hero-rise]",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.14 },
      );

      intro.fromTo(
        "[data-hero-fade]",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 },
        "-=0.4",
      );

      /* Pinned dive: copy lifts away, the camera flies into the tesseract,
         and the club archive readouts surface inside the wireframe. */
      const dive = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=500%",
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      dive.to(copyRef.current, { autoAlpha: 0, y: -60, duration: 0.45, ease: "none" }, 0);

      dive.to(progressRef, { current: 1, duration: 1.35, ease: "none" }, 0.25);

      section.querySelectorAll<HTMLElement>("[data-slide]").forEach((slide, i) => {
        const start = 1.2 + i * 0.9;
        dive.fromTo(
          slide,
          { autoAlpha: 0, scale: 0.96, y: 40 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: "none" },
          start,
        );
        dive.to(
          slide,
          { autoAlpha: 0, scale: 1.05, y: -40, duration: 0.3, ease: "none" },
          start + 0.62,
        );
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100dvh] w-full flex-col justify-center overflow-hidden bg-space-deep"
      aria-labelledby="msc-hero-title"
    >
      <div className="msc-atmosphere pointer-events-none absolute inset-0 -z-30" aria-hidden="true" />
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <TesseractCanvas progressRef={progressRef} />
      </div>
      <div className="msc-vignette pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-space-deep via-transparent to-space-deep/70"
        aria-hidden="true"
      />

      <div className="space-grain pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 lg:px-16">
        <div ref={copyRef}>
          <p
            data-hero-rise
            className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion"
          >
            MANARAT SCIENCE CLUB
          </p>

          <h1
            id="msc-hero-title"
            className="mt-6 font-voyage text-[1.8rem] font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-[3.5rem]"
          >
            <span data-hero-rise className="block">
              THINK LIKE A SCIENTIST.
            </span>
            <span data-hero-rise className="block text-ion-bright">
              COMPETE LIKE A CHAMPION.
            </span>
          </h1>

          <p
            data-hero-fade
            className="mt-6 max-w-[34rem] font-space-body text-base leading-7 text-space-ivory/75 sm:text-lg sm:leading-8"
          >
            Showcase your experiments, defend your hypothesis, and stand out
            among the best young scientists in the region.
          </p>

          <p
            data-hero-fade
            className="mt-10 font-mono text-[0.62rem] font-medium uppercase tracking-[0.3em] text-ion"
          >
            Enter the Competition.
          </p>

          <div data-hero-fade className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center whitespace-nowrap bg-ion px-8 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-space-deep transition-colors duration-300 hover:bg-ion-bright"
            >
              Register for STEM Fest
            </Link>
            <Link
              href="/events"
              className="inline-flex h-12 items-center justify-center whitespace-nowrap border border-ion-line px-8 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-ion transition-colors duration-300 hover:border-ion hover:text-ion-bright"
            >
              Read About the STEM Fest
            </Link>
          </div>

          <p
            data-hero-fade
            className="mt-14 font-mono text-[0.6rem] uppercase tracking-[0.26em] text-space-muted"
          >
            {metrics.members} members / {metrics.activeTeams} divisions / {metrics.completedProjects} projects
          </p>
        </div>
      </div>

      {/* Static-first: renders as a plain grid — readable without JS and
          for prefers-reduced-motion visitors. When JS is present and motion
          is allowed, the `html.motion-ok` gate rules in globals.css turn
          the stage into the absolutely positioned slide deck and GSAP
          drives the reveal, so the pre-hydration HTML never shows the
          stacked-slides flash. */}
      <div className="msc-slide-stage mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-16">
        <div className="grid gap-12">
          {stemfestSegments.map((segment) => (
            <div key={segment.id} data-slide>
              <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.34em] text-ion">
                Segment {segment.index}
              </p>
              <h2 className="mt-4 font-voyage text-4xl font-bold uppercase leading-[1.05] tracking-tight text-space-ivory sm:text-6xl lg:text-7xl">
                {segment.title}
              </h2>
              <p className="mt-5 max-w-[46ch] font-space-body text-base leading-7 text-space-ivory/70 sm:text-lg sm:leading-8">
                {segment.description}
              </p>
              {segment.items.length > 0 && (
                <ol className="mt-6 list-none space-y-1 max-w-[64ch] font-mono text-[0.68rem] uppercase leading-6 tracking-[0.22em] text-ion-bright">
                  {segment.items.map((item, itemIndex) => (
                    <li key={item}>
                      {itemIndex + 1}. {item}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
