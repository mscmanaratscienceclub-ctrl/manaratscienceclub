const KPI_CARDS = 4;
const LIST_PANELS = 3;
const TABLE_ROWS = 6;
const RANKED_ROWS = 5;
const TREND_BARS = 30;

/**
 * Streams instantly while the dashboard awaits its queries. The database lives in
 * ap-northeast-2, so every admin view costs a few hundred milliseconds of round
 * trips — without this boundary the whole segment renders blank until the last
 * query resolves.
 *
 * The shapes mirror the real layout (four figures, a wide chart beside a ring,
 * three ranked lists, a table) so the page does not reflow when the data arrives —
 * down to the accent edge every real panel carries, which is why the bones wear
 * `border-t-admin-accent` too and the arrival of data reads as a fill rather than
 * a different page.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12" aria-busy="true">
      <span className="sr-only" role="status">
        Loading admin data…
      </span>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[12px] border border-admin-line admin-edge-top admin-wash-masthead px-6 py-6 motion-safe:animate-pulse">
        <div>
          <div className="h-3 w-24 rounded bg-admin-line" />
          <div className="mt-3 h-9 w-56 rounded-lg bg-admin-line" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-admin-surface" />
        </div>
        <div className="h-8 w-40 rounded-lg bg-admin-surface" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: KPI_CARDS }, (_, index) => (
          <div
            key={index}
            className="h-40 rounded-[10px] border border-admin-line admin-edge-top bg-admin-surface p-5 motion-safe:animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-3 w-28 rounded bg-admin-sunken" />
                <div className="mt-4 h-8 w-20 rounded bg-admin-line" />
              </div>
              <div className="size-10 rounded-xl bg-admin-sunken" />
            </div>
            <div className="mt-4 h-3 w-36 rounded bg-admin-sunken" />
            <div className="mt-3 h-8 w-full rounded bg-admin-sunken" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[10px] border border-admin-line bg-admin-surface p-6 xl:col-span-2">
          <div className="h-5 w-44 rounded bg-admin-line" />
          <div className="mt-2 h-3 w-64 max-w-full rounded bg-admin-sunken" />
          <div className="mt-6 flex h-44 items-end gap-[3px] motion-safe:animate-pulse">
            {Array.from({ length: TREND_BARS }, (_, index) => (
              <div
                key={index}
                className="flex-1 rounded-[2px] bg-admin-line"
                // Deterministic, uneven heights so the skeleton reads as a chart
                // rather than a solid block — no randomness, so it renders the
                // same on the server and after hydration.
                style={{ height: `${28 + ((index * 37) % 68)}%` }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[10px] border border-admin-line bg-admin-surface p-6">
          <div className="h-5 w-36 rounded bg-admin-line" />
          <div className="mt-2 h-3 w-44 rounded bg-admin-sunken" />
          <div className="mt-6 flex items-center gap-6">
            <div className="size-36 shrink-0 rounded-full bg-admin-line motion-safe:animate-pulse" />
            <div className="flex-1 space-y-4 motion-safe:animate-pulse">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-8 rounded bg-admin-sunken" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: LIST_PANELS }, (_, panel) => (
          <div key={panel} className="rounded-[10px] border border-admin-line bg-admin-surface p-6">
            <div className="h-5 w-40 rounded bg-admin-line" />
            <div className="mt-2 h-3 w-52 rounded bg-admin-sunken" />
            <div className="mt-6 space-y-5 motion-safe:animate-pulse">
              {Array.from({ length: RANKED_ROWS }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-40 rounded bg-admin-line" />
                    <div className="h-3.5 w-8 rounded bg-admin-sunken" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-admin-sunken" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-admin-line admin-edge-top bg-admin-surface">
        <div className="border-b border-admin-line admin-wash-head px-6 py-4">
          <div className="h-5 w-44 rounded bg-admin-surface" />
        </div>
        <div className="divide-y divide-admin-line">
          {Array.from({ length: TABLE_ROWS }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-6 px-6 py-4 motion-safe:animate-pulse"
            >
              <div className="h-4 flex-1 rounded bg-admin-line" />
              <div className="h-4 w-20 rounded bg-admin-sunken" />
              <div className="h-4 w-32 rounded bg-admin-sunken" />
              <div className="h-4 w-24 rounded bg-admin-sunken" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
