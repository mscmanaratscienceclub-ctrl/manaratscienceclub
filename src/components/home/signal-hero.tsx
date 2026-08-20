"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

import TesseractCanvas from "@/components/home/tesseract-canvas";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { metrics } from "@/lib/data";
import { stemfestSegments } from "@/lib/data/stemfest";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
}

const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01";

export default function SignalHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const headlineTop = section.querySelector<HTMLElement>("[data-scramble-top]");
      const headlineBottom = section.querySelector<HTMLElement>("[data-scramble-bottom]");

      /* Decode sequence: status line, then the two headline rows resolve
         out of static, then subtext and CTAs surface. */
      const intro = gsap.timeline({ defaults: { ease: "none" } });

      intro.to("[data-scramble-status]", {
        duration: 0.7,
        scrambleText: { text: "SIGNAL ACQUIRED — MANARAT SCIENCE CLUB", chars: SCRAMBLE_CHARS, speed: 0.6 },
      });

      if (headlineTop) {
        intro.to(
          headlineTop,
          {
            duration: 0.9,
            scrambleText: { text: "THINK LIKE A SCIENTIST.", chars: SCRAMBLE_CHARS, speed: 0.45 },
          },
          "-=0.25",
        );
      }
      if (headlineBottom) {
        intro.to(
          headlineBottom,
          {
            duration: 1.0,
            scrambleText: { text: "COMPETE LIKE A CHAMPION.", chars: SCRAMBLE_CHARS, speed: 0.45 },
          },
          "-=0.55",
        );
      }

      intro.fromTo(
        "[data-hero-fade]",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" },
        "-=0.45",
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
      aria-labelledby="signal-title"
    >
      <div className="signal-atmosphere pointer-events-none absolute inset-0 -z-30" aria-hidden="true" />
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <TesseractCanvas progressRef={progressRef} />
      </div>
      <div className="signal-vignette pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-space-deep via-transparent to-space-deep/70"
        aria-hidden="true"
      />

      <div className="space-grain pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 lg:px-16">
        <div ref={copyRef}>
          <p
            data-scramble-status
            className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion"
          >
            SIGNAL ACQUIRED — MANARAT SCIENCE CLUB
          </p>

          <h1
            id="signal-title"
            className="mt-6 font-voyage text-[1.8rem] font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-[3.5rem]"
          >
            <span data-scramble-top className="block">
              THINK LIKE A SCIENTIST.
            </span>
            <span data-scramble-bottom className="block text-ion-bright">
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

      <div
        className={
          reducedMotion
            ? "mx-auto w-full max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-16"
            : "pointer-events-none absolute inset-0 -z-10"
        }
      >
        <div className={reducedMotion ? "grid gap-12" : undefined}>
          {stemfestSegments.map((segment) => (
            <div
              key={segment.id}
              data-slide
              className={
                reducedMotion
                  ? undefined
                  : "absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
              }
            >
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
                <p className="mt-6 max-w-[64ch] font-mono text-[0.68rem] uppercase leading-6 tracking-[0.22em] text-ion-bright">
                  {segment.items.join("  /  ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
