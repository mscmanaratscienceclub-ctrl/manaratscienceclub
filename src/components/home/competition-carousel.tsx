"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";

import { competitionShowcase } from "@/lib/data";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const LOOP_SECONDS = 45;

export default function CompetitionCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();
  const frames = [...competitionShowcase, ...competitionShowcase];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reducedMotion) return;

    const tween = gsap.to(track, {
      xPercent: -50,
      ease: "none",
      duration: LOOP_SECONDS,
      repeat: -1,
    });

    const container = track.parentElement;
    const pause = () => tween.pause();
    const play = () => tween.play();
    container?.addEventListener("mouseenter", pause);
    container?.addEventListener("mouseleave", play);
    container?.addEventListener("focusin", pause);
    container?.addEventListener("focusout", play);

    return () => {
      container?.removeEventListener("mouseenter", pause);
      container?.removeEventListener("mouseleave", play);
      container?.removeEventListener("focusin", pause);
      container?.removeEventListener("focusout", play);
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <section id="showcase" className="border-t border-space-line-soft bg-space-deep py-20">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              Field archive
            </p>
            <h2 className="mt-3 max-w-[36rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl">
              Last year&apos;s competition
            </h2>
          </div>
          <p className="max-w-[26rem] font-space-body text-sm leading-relaxed text-space-muted">
            Frames from MSC&apos;s run at last year&apos;s national competition —
            placeholder shots for now, the full event archive is on its way.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <ul
          ref={trackRef}
          className="flex w-max items-stretch gap-4 pr-4"
          aria-label="Competition photo strip"
        >
          {frames.map((frame, index) => (
            <li
              key={`${frame.src}-${index}`}
              className="relative h-56 w-44 shrink-0 overflow-hidden border border-space-line-soft bg-space-black sm:h-72 sm:w-56"
              aria-hidden={index >= competitionShowcase.length}
            >
              <Image
                src={frame.src}
                alt={index < competitionShowcase.length ? frame.alt : ""}
                fill
                sizes="224px"
                className="object-cover"
                priority={index < 4}
              />
            </li>
          ))}
        </ul>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-space-deep to-transparent sm:w-32"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-space-deep to-transparent sm:w-32"
        />
      </div>
    </section>
  );
}
