"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";

import { competitionShowcase } from "@/lib/data";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const CELL_SIZES = [
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 1 },
] as const;

export default function CompetitionCarousel() {
  const gridRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || reducedMotion) return;

    const items = grid.querySelectorAll<HTMLLIElement>("[data-gallery-item]");

    const enterHandler = (e: Event) => {
      const target = e.currentTarget as HTMLLIElement;
      gsap.to(target, {
        scale: 1.02,
        borderColor: "var(--ion-bright)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const leaveHandler = (e: Event) => {
      const target = e.currentTarget as HTMLLIElement;
      gsap.to(target, {
        scale: 1,
        borderColor: "var(--space-line-soft)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    items.forEach((item) => {
      item.addEventListener("mouseenter", enterHandler);
      item.addEventListener("mouseleave", leaveHandler);
    });

    return () => {
      items.forEach((item) => {
        item.removeEventListener("mouseenter", enterHandler);
        item.removeEventListener("mouseleave", leaveHandler);
      });
    };
  }, [reducedMotion]);

  return (
    <section
      id="showcase"
      className="border-t border-space-line-soft bg-space-deep py-20"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion-bright">
              Field archive
            </p>
            <h2 className="mt-3 max-w-[36rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl">
              Last year&apos;s competition
            </h2>
          </div>
          <p className="max-w-[26rem] font-space-body text-sm leading-relaxed text-space-muted">
            Frames from MSC&apos;s run at last year&apos;s national competition
            — placeholder shots for now, the full event archive is on its way.
          </p>
        </div>

        <ul
          ref={gridRef}
          className="grid auto-rows-[140px] grid-cols-2 gap-3 sm:auto-rows-[180px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          aria-label="Competition photo gallery"
        >
          {competitionShowcase.map((frame, index) => {
            const size = CELL_SIZES[index % CELL_SIZES.length];
            return (
              <li
                key={frame.src}
                data-gallery-item
                className="relative overflow-hidden border border-space-line-soft bg-space-black transition-colors"
                style={{
                  gridColumn: `span ${size.cols}`,
                  gridRow: `span ${size.rows}`,
                }}
              >
                <Image
                  src={frame.src}
                  alt={frame.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
