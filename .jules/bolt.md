## 2026-06-20 - [Optimized Post Fetching & Formatting]
**Learning:** Found that the home page was fetching all posts and slicing them in memory. In a growing database, this is a significant bottleneck. Additionally, re-instantiating Intl.DateTimeFormat in loops is a common but avoidable CPU drain.
**Action:** Always implement database-level limits and hoist expensive Intl formatters to the module scope.

## 2025-05-15 - [Client-side List Optimization & Request Caching]
**Learning:** React list components often perform redundant O(N) transformations on every re-render. Memoizing filtered IDs into a Set allows for O(1) lookup during the rendering loop.
**Action:** Use `useMemo` for expensive data transformations in lists and `React.cache` for repetitive server-side data actions.
