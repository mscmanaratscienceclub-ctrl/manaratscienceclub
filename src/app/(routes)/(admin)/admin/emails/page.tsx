import { getBulkEmailAudience } from "@/lib/actions/registrations";
import {
  parseAdminQuery,
  stemfestSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import BulkEmailComposer from "./bulk-email-composer";

/**
 * The panel's bulk email sender.
 *
 * The audience is read from the URL with `stemfestSource` — the same filters the
 * Science Competition table uses — and both counts are resolved on the server
 * before anything renders, so an admin always sees who a blast would reach before
 * pressing the button.
 *
 * The two audience queries run **in sequence, never through `Promise.all`**:
 * stacking statements onto one pooled connection is what makes the Supavisor
 * pooler lose a response and hang the request (see `src/db/index.ts`).
 */
export default async function BulkEmailPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const state = parseAdminQuery(stemfestSource, await searchParams);

  const customAudience = await getBulkEmailAudience(state, "custom");
  const confirmationAudience = await getBulkEmailAudience(
    state,
    "confirmation",
  );

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          Bulk Emails
        </h1>
        <p className="mt-1 font-body text-ink/60">
          Write to a filtered group of STEM Fest registrations, or send the payment
          receipt to everyone whose payment is verified. Every message is sent from
          the club&rsquo;s own address, one recipient at a time.
        </p>
      </div>

      <BulkEmailComposer
        state={state}
        customAudience={customAudience}
        confirmationAudience={confirmationAudience}
      />
    </div>
  );
}
