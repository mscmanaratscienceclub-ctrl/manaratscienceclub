## 2026-06-20 - [Optimized Post Fetching & Formatting]
**Learning:** Found that the home page was fetching all posts and slicing them in memory. In a growing database, this is a significant bottleneck. Additionally, re-instantiating Intl.DateTimeFormat in loops is a common but avoidable CPU drain.
**Action:** Always implement database-level limits and hoist expensive Intl formatters to the module scope.

## 2026-10-24 - [O(1) Set-based Filtering for Lists]
**Learning:** In client components displaying lists with custom filter criteria (like tag selectors), calling a matching helper multiple times per item within the render loop (e.g. for filtering, styling, and spotlighting) leads to redundant O(N * M) calculations on every render.
**Action:** Use `useMemo` to pre-calculate a `Set` of visible item IDs, enabling fast O(1) lookups inside the render loop and improving list rendering efficiency.
