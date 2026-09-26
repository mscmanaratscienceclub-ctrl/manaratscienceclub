"use client";

import { stemfestSource, type AdminQueryState } from "@/lib/admin/filters";
import type { BulkEmailAudience } from "@/lib/admin/bulk-email";
import { useAdminFilters } from "@/lib/hooks/use-admin-filters";
import AudienceFilters from "./audience-filters";
import CustomMessageSection from "./custom-message-section";
import PaymentConfirmationSection from "./payment-confirmation-section";

/**
 * Where the bulk sender lives. A constant rather than a literal at each call:
 * `useAdminFilters` builds the audience URL from it, and the page reads the same
 * path back, so the two must not drift.
 */
export const BULK_EMAIL_PATH = "/admin/emails";

/**
 * The bulk email page's client half.
 *
 * The audience is not state kept in the browser: it is the URL. Changing a filter
 * navigates, the Server Component re-reads the audience with the same filter
 * builder the table uses, and both sections below are handed the new counts — so
 * what the page promises to send to is what a tab reload would still show.
 */
export default function BulkEmailComposer({
  state,
  customAudience,
  confirmationAudience,
}: {
  state: AdminQueryState;
  customAudience: BulkEmailAudience;
  confirmationAudience: BulkEmailAudience;
}) {
  const controls = useAdminFilters({
    sourceId: "stemfest",
    basePath: BULK_EMAIL_PATH,
    state,
  });

  return (
    <div className="flex flex-col gap-6">
      <AudienceFilters
        source={stemfestSource}
        state={state}
        controls={controls}
      />
      <CustomMessageSection state={state} audience={customAudience} />
      <PaymentConfirmationSection state={state} audience={confirmationAudience} />
    </div>
  );
}
