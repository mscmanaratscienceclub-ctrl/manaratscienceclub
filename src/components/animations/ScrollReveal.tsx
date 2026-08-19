"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Pixels the content travels while fading in. */
  y?: number;
  delay?: number;
  duration?: number;
  /** Stagger direct children instead of animating the wrapper as one block. */
  stagger?: number;
};

export default function ScrollReveal({
  children,
  className,
  y = 24,
  delay = 0,
  duration = 0.7,
  stagger,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    const targets = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power2.out",
          stagger: stagger ?? 0,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [reducedMotion, y, delay, duration, stagger]);

  return <div ref={ref} className={className}>{children}</div>;
}
