import { Mail } from "lucide-react";

import PageHeader from "@/components/admin/page-header";
import { getBulkEmailAudience } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
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
    <div
      style={adminAccentStyle(SECTION_ACCENT.emails)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <PageHeader
        eyebrow="Outreach"
        title="Bulk Emails"
        description="Write to a filtered group of STEM Fest registrations, or send the payment receipt to everyone whose payment is verified. Every message is sent from the club's own address, one recipient at a time."
        icon={Mail}
      />

      <BulkEmailComposer
        state={state}
        customAudience={customAudience}
        confirmationAudience={confirmationAudience}
      />
    </div>
  );
}
