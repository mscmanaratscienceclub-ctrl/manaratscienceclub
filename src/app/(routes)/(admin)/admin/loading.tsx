const STAT_CARDS = 4;
const TABLE_ROWS = 6;

/**
 * Streams instantly while an admin page awaits its queries. The database lives
 * in ap-northeast-2, so every admin view costs a few hundred milliseconds of
 * round trips — without this boundary the whole segment renders blank until the
 * last query resolves.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading admin data…
      </span>

      <div className="motion-safe:animate-pulse">
        <div className="h-9 w-64 rounded-lg bg-ink/10" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-ink/5" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: STAT_CARDS }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle motion-safe:animate-pulse"
          >
            <div className="h-12 w-12 shrink-0 rounded-xl bg-ink/10" />
            <div className="flex-1">
              <div className="h-8 w-16 rounded bg-ink/10" />
              <div className="mt-2 h-3 w-24 rounded bg-ink/5" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface shadow-subtle">
        <div className="border-b border-ink/5 px-6 py-4">
          <div className="h-9 w-full max-w-sm rounded-xl bg-ink/5 motion-safe:animate-pulse" />
        </div>
        <div className="divide-y divide-ink/5">
          {Array.from({ length: TABLE_ROWS }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 px-6 py-4 motion-safe:animate-pulse"
            >
              <div className="h-4 flex-1 rounded bg-ink/10" />
              <div className="h-4 w-20 rounded bg-ink/5" />
              <div className="h-4 w-32 rounded bg-ink/5" />
              <div className="h-4 w-24 rounded bg-ink/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
