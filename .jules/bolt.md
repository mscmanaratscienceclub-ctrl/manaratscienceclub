## 2026-06-20 - [Optimized Post Fetching & Formatting]
**Learning:** Found that the home page was fetching all posts and slicing them in memory. In a growing database, this is a significant bottleneck. Additionally, re-instantiating Intl.DateTimeFormat in loops is a common but avoidable CPU drain.
**Action:** Always implement database-level limits and hoist expensive Intl formatters to the module scope.
