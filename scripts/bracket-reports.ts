/**
 * Entry point for `pnpm reports:brackets`.
 *
 * Bundled and run by `scripts/bracket-reports.run.mjs`, which is also what gives
 * this file its `@/…` imports and its `--env-file=.env` connection — the same
 * shape as `verify-admin-db.ts` and `verify-pdf-export.ts`.
 */
import { build } from "./bracket-reports/build";

console.log(await build());
