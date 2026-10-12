/**
 * Shown in place of a figure whose source failed. Deliberately not a zero — a
 * missing number and a real zero must never look the same to an admin.
 */
export const UNAVAILABLE = "—";

/** Counts are numbers, or absent when the query behind them failed. */
export function formatCount(count: number | undefined): string {
  return typeof count === "number" ? String(count) : UNAVAILABLE;
}

/**
 * Resolves one of several independent sources that a page aggregates.
 *
 * An admin page reads more than one table, and a single failing source — a
 * cancelled statement, a lost pooler response, a table that is not migrated yet
 * — used to reject the whole `Promise.all` and blank the page, hiding the
 * sources that were perfectly healthy. Degrade that one source instead, and log
 * it so a real outage still reaches the function logs.
 *
 * Call it from `Promise.allSettled`, never `Promise.all`.
 */
export function unwrap<T>(
  result: PromiseSettledResult<T>,
  source: string,
): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(`[admin source failed: ${source}]`, result.reason);
  return null;
}
