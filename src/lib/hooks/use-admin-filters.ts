"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildAdminHref,
  FILTER_QUERY_PARAM,
  type AdminQueryState,
  type AdminSortId,
} from "@/lib/admin/filters";
import { useDebouncedValue } from "./use-debounce";

/** Everything a filter bar, a table and its pagination need to change the URL. */
export interface AdminFilterControls {
  /** Controlled value for the search box — live, i.e. *not* yet sent to the server. */
  search: string;
  setSearch: (value: string) => void;
  /**
   * Ask the server for the list the search box describes.
   *
   * Typing only rewrites the address bar (see `useAdminFilters`); this is the
   * deliberate commit — Enter, blur, or the caller's own equivalent.
   */
  commitSearch: () => void;
  /** `true` while the server component is re-querying for the new URL. */
  isPending: boolean;
  setFilter: (id: string, value: string) => void;
  /** Drops one filter, or the search box when `id` is `q`. */
  clearFilter: (id: string) => void;
  clearAll: () => void;
  setSort: (sort: AdminSortId) => void;
  goToPage: (page: number) => void;
  /**
   * The filter state an export opens on: exactly what is on screen.
   *
   * The export dialog asks for the state rather than a finished link because
   * what is exported is not only a filter state — the admin picks the columns
   * and the format in the dialog too, and only it can put those three together.
   */
  exportState: AdminQueryState;
}

/**
 * Drives every filter, the search box and pagination through the URL, which is
 * the single source of truth for what a table is showing.
 *
 * The URL is built by `buildAdminHref` from `src/lib/admin/filters.ts` — the same
 * function the pages and the report route parse with — so a filter can only ever
 * mean one thing. Because that builder omits default values and orders the values
 * it does write, two ways of reaching the same list produce byte-identical hrefs,
 * and the hook can compare against what it already has and skip work.
 *
 * It knows nothing about the source behind the table: it drives a URL, and the
 * href it builds is the whole of what it needs to know.
 *
 * ## Two stages, because a keystroke is not a request
 *
 * A discrete choice — a filter pick, a sort, a page, a chip removed — navigates:
 * the server re-queries and re-renders the table. Typing does not. Each pause in
 * the search box used to start a navigation, so a three-word search cost three
 * round trips and threw away the results of the first two; every one of them
 * re-serialised the whole table over the edge. So typing only rewrites the address
 * bar with `history.replaceState`, and the *list* is fetched by `commitSearch` —
 * Enter or blur — or by the next discrete choice, which folds the term in because
 * it derives from `urlState`.
 *
 * `urlState` is what the address bar says; `inFlight` is what the last navigation
 * targeted. Deriving from `urlState` is what stops a half-committed search term
 * being dropped by a filter picked right after it, and deduplicating against
 * `inFlight` rather than `urlState` is what keeps a soft-committed term fetchable
 * by the deliberate commit. A term typed while a navigation is in flight is parked
 * in `owed` and written to the bar once that navigation renders — replacing the
 * address bar mid-transition would leave the URL describing a state the incoming
 * render does not have.
 *
 * `exportState` reports `urlState` for the same reason a navigation derives from
 * it: exporting the moment a filter was picked must not export the list from
 * before it.
 */
export function useAdminFilters({
  basePath,
  state,
}: {
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

  // The search value this hook last wrote into the address bar — ours, or an
  // external navigation's (a back button, a filter link from elsewhere).
  const committed = useRef(state.query);

  // What the address bar currently describes: set by a soft commit (typing) or by
  // a navigation. New changes derive from it, so a term that is in the URL but not
  // yet in the results is carried into the next request instead of being dropped.
  const urlState = useRef<AdminQueryState | null>(null);

  // The state the last navigation targeted, cleared once it renders. Dedupe
  // compares against this, not `urlState` — otherwise a soft-committed term would
  // look already fetched and `commitSearch` would do nothing.
  const inFlight = useRef<AdminQueryState | null>(null);

  // A term typed while a navigation was in flight, written when that one lands.
  const owed = useRef<string | null>(null);

  const searchRef = useRef(search);
  searchRef.current = search;

  /**
   * The state a change should be applied to: what the address bar says, falling
   * back to what the server last rendered.
   */
  const baseState = useCallback(() => urlState.current ?? stateRef.current, []);

  const hrefOf = useCallback(
    (next: AdminQueryState) => buildAdminHref(basePath, next),
    [basePath],
  );

  /** Point the address bar at `next` without asking the server for anything. */
  const softCommit = useCallback(
    (next: AdminQueryState) => {
      urlState.current = next;
      const href = hrefOf(next);
      if (href !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", href);
      }
    },
    [hrefOf],
  );

  const navigate = useCallback(
    (next: AdminQueryState, mode: "push" | "replace" = "replace") => {
      const href = hrefOf(next);
      if (href === hrefOf(inFlight.current ?? stateRef.current)) {
        // Already rendered or already on its way — only the address bar needs
        // catching up (the search box was emptied, or all was cleared).
        softCommit(next);
        return;
      }
      urlState.current = next;
      inFlight.current = next;
      startTransition(() => {
        if (mode === "push") router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [hrefOf, router, softCommit],
  );

  // Once a navigation has rendered, the address bar and the results describe the
  // same state again, so the derived state falls back to the server's. A term
  // parked during the transition is written to the bar now, not before.
  useEffect(() => {
    if (isPending) return;
    inFlight.current = null;
    const pending = owed.current;
    if (pending !== null) {
      owed.current = null;
      if (pending !== committed.current) {
        committed.current = pending;
        softCommit({ ...baseState(), query: pending, page: 1 });
      }
      return;
    }
    const current = urlState.current;
    if (current && hrefOf(current) === hrefOf(stateRef.current)) urlState.current = null;
  }, [isPending, hrefOf, softCommit, baseState, state]);

  // Back/forward or an external link changed the search under us: refill the box.
  // The bar now says exactly what the server rendered, so nothing is pending.
  useEffect(() => {
    if (state.query === committed.current) return;
    committed.current = state.query;
    urlState.current = null;
    owed.current = null;
    setSearch(state.query);
  }, [state.query]);

  // Typing moves the address bar only; the list arrives on `commitSearch`.
  useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    if (isPending) {
      owed.current = debounced;
      return;
    }
    softCommit({ ...baseState(), query: debounced, page: 1 });
  }, [debounced, isPending, softCommit, baseState]);

  const commitSearch = useCallback(() => {
    const term = searchRef.current;
    owed.current = null;
    committed.current = term;
    navigate({ ...baseState(), query: term, page: 1 });
  }, [navigate, baseState]);

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
      owed.current = null;
      setSearch("");
      navigate({ ...baseState(), query: "", page: 1 });
    },
    [navigate, setFilter, baseState],
  );

  const clearAll = useCallback(() => {
    committed.current = "";
    owed.current = null;
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
    commitSearch,
    isPending,
    setFilter,
    clearFilter,
    clearAll,
    setSort,
    goToPage,
    // Built from the *live* search box rather than the committed query, so
    // exporting right after typing still includes the term being typed — and from
    // the address bar's state, so it also includes a filter still being fetched.
    exportState: {
      ...(urlState.current ?? state),
      query: search.trim(),
      page: 1,
    },
  };
}
