"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { Camera, ExternalLink, GitFork, Globe, MessageCircle, User } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import "./chroma-grid.css";

export interface ChromaSocial {
  platform: string;
  url: string;
}

export interface ChromaItem {
  id?: string;
  image?: string;
  title: string;
  subtitle?: string;
  handle?: string;
  borderColor?: string;
  gradient?: string;
  url?: string;
  socials?: ChromaSocial[];
}

interface ChromaGridProps {
  items: ChromaItem[];
  className?: string;
  radius?: number;
  columns?: number;
  rows?: number;
  damping?: number;
  fadeOut?: number;
  ease?: string;
}

const socialIcons: Record<string, typeof Camera> = {
  instagram: Camera,
  facebook: MessageCircle,
  github: GitFork,
  linkedin: ExternalLink,
  website: Globe,
};

export default function ChromaGrid({
  items,
  className = "",
  radius = 300,
  columns = 3,
  rows = 2,
  damping = 0.45,
  fadeOut = 0.6,
  ease = "power3.out",
}: ChromaGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const setX = useRef<((value: number) => void) | null>(null);
  const setY = useRef<((value: number) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setX.current = gsap.quickSetter(el, "--x", "px") as (value: number) => void;
    setY.current = gsap.quickSetter(el, "--y", "px") as (value: number) => void;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: reducedMotion ? 0 : damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true,
    });
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: reducedMotion ? 0 : 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, { opacity: 1, duration: reducedMotion ? 0 : fadeOut, overwrite: true });
  };

  const handleCardClick = (item: ChromaItem) => {
    const target = item.url ?? item.socials?.[0]?.url;
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleCardMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={rootRef}
      className={`chroma-grid ${className}`}
      style={{ "--r": `${radius}px`, "--cols": columns, "--rows": rows } as React.CSSProperties}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {items.map((item) => (
          <article
            key={item.id ?? item.title}
            className="chroma-card"
            onMouseMove={handleCardMove}
            onClick={() => handleCardClick(item)}
            style={
              {
                "--card-border": item.borderColor ?? "transparent",
                "--card-gradient": item.gradient,
                cursor: item.url || item.socials?.length ? "pointer" : "default",
              } as React.CSSProperties
            }
          >
            {/* Curated members come from pre-optimised WebP in the bucket
                (scripts/optimize-bucket-images.mjs); local ones are already
                .webp in /public. Either way the bytes are final, so skip the
                optimizer and its per-view transformation cost. */}
            <div className="chroma-img-wrapper">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="320px"
                  loading="lazy"
                  className="chroma-img"
                  unoptimized
                />

              ) : (
                <div className="chroma-img-fallback">
                  <User className="size-10" aria-hidden="true" />
                </div>
              )}
            </div>
            <footer className="chroma-info">
              <h3 className="name">{item.title}</h3>
              {item.handle && <span className="handle">{item.handle}</span>}
              {item.subtitle && <p className="role">{item.subtitle}</p>}
              {item.socials && item.socials.length > 0 && (
                <div className="chroma-socials">
                  {item.socials.map((social) => {
                    const Icon = socialIcons[social.platform];
                    if (!Icon) return null;
                    return (
                      <a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${item.title} on ${social.platform}`}
                      >
                        <Icon aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              )}
            </footer>
          </article>
      ))}
      <div className="chroma-overlay" aria-hidden="true" />
      <div ref={fadeRef} className="chroma-fade" aria-hidden="true" />
    </div>
  );
}
