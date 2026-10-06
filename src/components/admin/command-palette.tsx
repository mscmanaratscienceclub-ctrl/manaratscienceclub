"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";

import { ADMIN_NAV_GROUPS, ADMIN_ACTIONS, type AdminNavEntry } from "@/lib/admin/nav";
import { adminAccentStyle } from "@/lib/admin/accents";
import { cn } from "@/lib/utils";

/**
 * The panel's command palette: ⌘K (or Ctrl+K), type a word, land somewhere.
 *
 * Six sections whose tables look much alike from across a room is a lot to click
 * through, and an admin who knows where they are going should not have to look for
 * it. The palette reuses the rail's own data (`src/lib/admin/nav.ts`), so a section
 * can never exist in one and not the other, and it searches the words an admin
 * actually types ("fest", "bKash", "messages") rather than only route labels.
 *
 * It is a combobox, not a list of buttons: one tabbable element (the input), arrow
 * keys move the selection, `aria-activedescendant` carries it to a screen reader,
 * and nothing else can steal focus while it is open. That is also what keeps the
 * escape hatch honest — Escape and the backdrop both close it, and the button that
 * opened it gets focus back.
 */

interface PaletteItem extends AdminNavEntry {
  group: string;
  external?: boolean;
}

const ACTIONS_GROUP = "Actions";

const ITEMS: PaletteItem[] = [
  ...ADMIN_NAV_GROUPS.flatMap((group) =>
    group.entries.map((entry) => ({ ...entry, group: group.title })),
  ),
  ...ADMIN_ACTIONS.map((entry) => ({ ...entry, group: ACTIONS_GROUP })),
];

/** Where a query matches, if anywhere. Lower rank wins; ties keep rail order. */
function rank(item: PaletteItem, query: string): number | null {
  if (!query) return 0;
  const label = item.label.toLowerCase();
  if (label.startsWith(query)) return 0;
  if (label.includes(query)) return 1;
  if (item.keywords?.some((word) => word.includes(query))) return 2;
  if (item.href.toLowerCase().includes(query)) return 3;
  return null;
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.map((item) => ({ item, score: rank(item, q) }))
      .filter((hit): hit is { item: PaletteItem; score: number } => hit.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((hit) => hit.item);
  }, [query]);

  // A fresh open starts clean and points at the first result; a fresh close drops
  // the query so reopening does not resume a search abandoned mid-word.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  function go(item: PaletteItem) {
    onClose();
    if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
    else router.push(item.href);
  }

  // Keep the selected row in view as the arrow keys walk a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" data-print="chrome">
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
            className="absolute inset-0 bg-admin-ink/35 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Go to a section"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[12vh] left-1/2 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[12px] border border-admin-line bg-admin-surface shadow-admin-dialog"
          >
            <div className="flex items-center gap-3 border-b border-admin-line px-4">
              <Search className="size-4 shrink-0 text-admin-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls="palette-results"
                aria-autocomplete="list"
                aria-activedescendant={
                  results[cursor] ? `palette-option-${cursor}` : undefined
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") return onClose();
                  if (event.key === "Tab") return event.preventDefault();
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCursor((c) => Math.min(c + 1, results.length - 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const item = results[cursor];
                    if (item) go(item);
                  }
                }}
                placeholder="Jump to a section…"
                className="h-12 w-full bg-transparent font-space-body text-sm text-admin-ink outline-none placeholder:text-admin-muted"
              />
              <kbd className="hidden shrink-0 rounded-[4px] border border-admin-line bg-admin-sunken px-1.5 py-0.5 font-mono text-2xs text-admin-muted sm:block">
                esc
              </kbd>
            </div>

            {results.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-space-body text-sm text-admin-ink-soft">
                  Nothing in the panel matches “{query.trim()}”.
                </p>
                <p className="mt-1 font-space-body text-xs text-admin-muted">
                  Try a section name, or what it deals with: payments, messages, volunteer.
                </p>
              </div>
            ) : (
              <ul
                ref={listRef}
                id="palette-results"
                role="listbox"
                aria-label="Panel sections"
                className="max-h-[min(22rem,50vh)] overflow-y-auto p-2"
              >
                {results.map((item, index) => {
                  const selected = index === cursor;
                  const hueless = item.group === ACTIONS_GROUP;
                  const showsGroup =
                    index === 0 || results[index - 1]?.group !== item.group;

                  return (
                    <li key={item.href}>
                      {showsGroup && (
                        <p className="px-2 pt-3 pb-1 font-space-body text-2xs font-semibold tracking-[0.14em] text-admin-muted uppercase first:pt-1">
                          {item.group}
                        </p>
                      )}
                      <button
                        type="button"
                        id={`palette-option-${index}`}
                        role="option"
                        aria-selected={selected}
                        data-selected={selected}
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => go(item)}
                        style={hueless ? undefined : adminAccentStyle(item.accent)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left font-space-body text-sm transition-colors",
                          selected
                            ? hueless
                              ? "bg-admin-sunken font-medium text-admin-ink"
                              : "bg-admin-accent-soft font-medium text-admin-accent-ink"
                            : "text-admin-ink-soft",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-[6px]",
                            selected
                              ? hueless
                                ? "bg-admin-ink text-white"
                                : "admin-fill-ink text-white"
                              : hueless
                                ? "bg-admin-sunken text-admin-muted"
                                : "bg-admin-accent-soft text-admin-accent-ink",
                          )}
                        >
                          <item.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className="shrink-0 font-mono text-2xs text-admin-muted">
                          {item.href}
                        </span>
                        {selected && (
                          <CornerDownLeft
                            className={cn(
                              "size-3.5 shrink-0",
                              hueless ? "text-admin-ink" : "text-admin-accent-ink",
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
