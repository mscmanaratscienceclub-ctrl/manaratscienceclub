## 2026-06-20 - [Optimized Post Fetching & Formatting]
**Learning:** Found that the home page was fetching all posts and slicing them in memory. In a growing database, this is a significant bottleneck. Additionally, re-instantiating Intl.DateTimeFormat in loops is a common but avoidable CPU drain.
**Action:** Always implement database-level limits and hoist expensive Intl formatters to the module scope.

## 2026-06-21 - [Memoized Client-Side List Processing]
**Learning:** In client components rendering large lists (like the blogs page), repeated O(N*T) tag extraction and O(N) author counting on every render causes measurable UI lag during state updates (like tag filtering).
**Action:** Use `useMemo` for all derived data transformations and implement O(1) visibility lookups using a memoized `Set` of IDs to keep the render loop tight.
