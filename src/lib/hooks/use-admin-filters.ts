"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildAdminHref,
  buildReportHref,
  FILTER_QUERY_PARAM,
  type AdminQueryState,
  type AdminSortId,
  type AdminSourceId,
} from "@/lib/admin/filters";
import { useDebouncedValue } from "./use-debounce";

/** Everything a filter bar, a table and its pagination need to change the URL. */
export interface AdminFilterControls {
  /** Controlled value for the search box — live, i.e. *not* yet debounced. */
  search: string;
  setSearch: (value: string) => void;
  /** `true` while the server component is re-querying for the new URL. */
  isPending: boolean;
  setFilter: (id: string, value: string) => void;
  /** Drops one filter, or the search box when `id` is `q`. */
  clearFilter: (id: string) => void;
  clearAll: () => void;
  setSort: (sort: AdminSortId) => void;
  goToPage: (page: number) => void;
  /** Href of the printable report for exactly what is on screen. */
  exportHref: string;
}

/**
 * Drives every filter, the search box and pagination through the URL, which is
 * the single source of truth for what a table is showing.
 *
 * The URL is built by `buildAdminHref` from `src/lib/admin/filters.ts` — the same
 * function the pages and the report route parse with — so a filter can only ever
 * mean one thing. Because that builder omits default values and orders the values
 * it does write, two ways of reaching the same list produce byte-identical hrefs;
 * the hook compares against the href it last sent and skips navigation when
 * nothing actually changed. Without that, the debounced search box re-commits its
 * own value on every server render and navigates in a loop.
 *
 * A change is applied to the state we have already sent while its navigation is
 * still in flight, rather than to the props we were last rendered with: the server
 * state only arrives when its round trip finishes, so two changes inside one round
 * trip would otherwise each derive from the state before either and the second
 * would silently drop the first.
 */
export function useAdminFilters({
  sourceId,
  basePath,
  state,
}: {
  sourceId: AdminSourceId;
  basePath: string;
  state: AdminQueryState;
}): AdminFilterControls {
  const router = useRouter();
  const [search, setSearch] = useState(state.query);
  const [isPending, startTransition] = useTransition();
  const debounced = useDebouncedValue(search, 350);

  // The latest URL state, read by callbacks and effects without making them
  // depend on a prop that is a fresh object on every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  // The search value this hook last committed to the URL — ours, or an external
  // navigation's (a back button, a filter link from elsewhere).
  const committed = useRef(state.query);

  // The state this hook has already sent to the URL, while the navigation that
  // renders it is still in flight.
  const inFlight = useRef<AdminQueryState | null>(null);

  // `isPending` is true from the moment `navigate` starts a transition until the
  // state it fetched has been rendered, so clearing on `false` can never wipe a
  // change that is still on its way.
  useEffect(() => {
    if (!isPending) inFlight.current = null;
  }, [isPending]);

  /**
   * The state a change should be applied to: normally the server's, but while a
   * navigation is in flight, the one already sent.
   *
   * The server's state only arrives once its round trip finishes, so two changes
   * inside one round trip — two filter picks, or a pick plus the debounced search
   * — would otherwise each derive from the state before either, and the second
   * would silently drop the first.
   */
  const baseState = useCallback(() => inFlight.current ?? stateRef.current, []);

  const navigate = useCallback(
    (next: AdminQueryState, mode: "push" | "replace" = "replace") => {
      const href = buildAdminHref(basePath, next);
      if (href === buildAdminHref(basePath, baseState())) return;
      inFlight.current = next;
      startTransition(() => {
        if (mode === "push") router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [basePath, baseState, router],
  );

  // Back/forward or an external link changed the search under us: refill the box.
  useEffect(() => {
    if (state.query === committed.current) return;
    committed.current = state.query;
    setSearch(state.query);
  }, [state.query]);

  // Debounced typing commits the search term and resets to the first page.
  useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    navigate({ ...baseState(), query: debounced, page: 1 });
  }, [debounced, navigate, baseState]);

  const setFilter = useCallback(
    (id: string, value: string) => {
      const current = baseState();
      const values = { ...current.values };
      if (value) values[id] = value;
      else delete values[id];
      navigate({ ...current, values, page: 1 });
    },
    [navigate, baseState],
  );

  const clearFilter = useCallback(
    (id: string) => {
      if (id !== FILTER_QUERY_PARAM) {
        setFilter(id, "");
        return;
      }
      committed.current = "";
      setSearch("");
      navigate({ ...baseState(), query: "", page: 1 });
    },
    [navigate, setFilter, baseState],
  );

  const clearAll = useCallback(() => {
    committed.current = "";
    setSearch("");
    const current = baseState();
    // The sort is kept: it is how the admin is reading the list, not a criterion
    // narrowing it, and resetting it under them is a surprise.
    navigate({ query: "", values: {}, sort: current.sort, page: 1 });
  }, [navigate, baseState]);

  const setSort = useCallback(
    (sort: AdminSortId) => {
      navigate({ ...baseState(), sort, page: 1 });
    },
    [navigate, baseState],
  );

  const goToPage = useCallback(
    (page: number) => {
      navigate({ ...baseState(), page }, "push");
    },
    [navigate, baseState],
  );

  return {
    search,
    setSearch,
    isPending,
    setFilter,
    clearFilter,
    clearAll,
    setSort,
    goToPage,
    // Built from the *live* search box rather than the committed query, so
    // exporting right after typing still includes the term being typed — and from
    // the in-flight state, so it also includes a filter still being fetched.
    exportHref: buildReportHref(sourceId, {
      ...(inFlight.current ?? state),
      query: search.trim(),
      page: 1,
    }),
  };
}
