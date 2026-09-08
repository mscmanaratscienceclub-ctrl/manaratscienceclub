"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "./use-debounce";

function buildUrl(basePath: string, query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Drives admin table search + pagination through the URL. The search box is
 * debounced, then a `router.replace` runs inside a transition so the server
 * component re-queries the DB for just the matching page. `isPending` powers the
 * table's loading state during the remote round-trip.
 */
export function useAdminSearch({ query, basePath }: { query: string; basePath: string }) {
  const router = useRouter();
  const [input, setInput] = useState(query);
  const [isPending, startTransition] = useTransition();
  const debounced = useDebouncedValue(input, 350);

  // The query string currently reflected in the URL — ours or an external nav.
  const lastPushed = useRef(query);

  // Back/forward or a pagination click changed the URL under us: resync the box.
  useEffect(() => {
    if (query !== lastPushed.current) {
      lastPushed.current = query;
      setInput(query);
    }
  }, [query]);

  // Debounced typing: commit the new query to the URL, resetting to page 1.
  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    startTransition(() => {
      router.replace(buildUrl(basePath, debounced, 1), { scroll: false });
    });
  }, [debounced, basePath, router]);

  const goToPage = useCallback(
    (page: number) => {
      startTransition(() => {
        router.replace(buildUrl(basePath, query, page), { scroll: false });
      });
    },
    [basePath, query, router],
  );

  return { input, setInput, isPending, goToPage };
}
