"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ListTree } from "lucide-react";

interface TocItem {
  level: number;
  text: string;
  id: string;
}

export default function TocSidebar({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      }
    };

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const observer = new IntersectionObserver(handleIntersect, {
          rootMargin: "-80px 0px -70% 0px",
          threshold: 0,
        });
        observer.observe(el);
        observers.push(observer);
      }
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [items]);

  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const link = navRef.current.querySelector(`a[href="#${activeId}"]`);
    if (link) {
      link.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="border border-space-line-soft bg-space-deep/60">
      <div className="border-b border-space-line-soft px-5 py-3">
        <h3 className="flex items-center gap-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted">
          <ListTree className="size-4 text-ion" /> On this page
        </h3>
      </div>
      <nav ref={navRef} className="max-h-[60vh] overflow-y-auto px-5 py-4">
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={cn(
                  "block border-l py-0.5 pl-3 text-xs leading-relaxed transition-colors",
                  activeId === item.id
                    ? "border-ion font-semibold text-ion-bright"
                    : "border-space-line-soft text-space-muted hover:text-ion",
                  item.level === 1 ? "font-medium" : "",
                  item.level === 2 ? "pl-5" : "",
                  item.level === 3 ? "pl-7 text-[11px]" : ""
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
