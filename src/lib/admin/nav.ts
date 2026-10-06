/**
 * The admin panel's navigation, as data.
 *
 * The rail and the command palette both need this list, and neither owns the
 * other: the rail renders it grouped and coloured, the palette searches it. Keeping
 * one copy is what stops a section appearing in one and not the other.
 *
 * Plain data plus icon references, so a Server Component may read it and a client
 * leaf may render it. `keywords` exists because an admin searches for "fest" or
 * "bKash" before they search for "Science Competition".
 */

import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  FlaskConical,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  PenSquare,
  Printer,
} from "lucide-react";

import { SECTION_ACCENT, type AdminAccent } from "./accents";

export interface AdminNavEntry {
  href: string;
  label: string;
  /** The section's hue, so the rail and the palette say the same thing. */
  accent: AdminAccent;
  icon: LucideIcon;
  /** `/admin` is a prefix of every other route, so it needs exact matching. */
  exact: boolean;
  /** Words that reach this entry besides its label. */
  keywords?: string[];
}

export interface AdminNavGroup {
  title: string;
  entries: AdminNavEntry[];
}

/** The sections, in rail order, grouped by the job each one does. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "Overview",
    entries: [
      {
        href: "/admin",
        label: "Dashboard",
        accent: SECTION_ACCENT.dashboard,
        icon: LayoutDashboard,
        exact: true,
        keywords: ["home", "figures", "kpis", "summary", "stem fest"],
      },
    ],
  },
  {
    title: "Form responses",
    entries: [
      {
        href: "/admin/campus-ambassador",
        label: "Campus Ambassador",
        accent: SECTION_ACCENT.campusAmbassador,
        icon: GraduationCap,
        exact: false,
        keywords: ["ambassador", "applications", "recruitment"],
      },
      {
        href: "/admin/volunteer",
        label: "Volunteer",
        accent: SECTION_ACCENT.volunteer,
        icon: HandHeart,
        exact: false,
        keywords: ["volunteers", "helping", "applications"],
      },
      {
        href: "/admin/science-competition",
        label: "Science Competition",
        accent: SECTION_ACCENT.scienceCompetition,
        icon: FlaskConical,
        exact: false,
        keywords: ["stem fest", "stemfest", "registrations", "payments", "bkash"],
      },
      {
        href: "/admin/sms-logs",
        label: "SMS Logs",
        accent: SECTION_ACCENT.smsLogs,
        icon: MessageSquareText,
        exact: false,
        keywords: ["messages", "delivery", "gateway", "otp"],
      },
    ],
  },
  {
    title: "Outreach",
    entries: [
      {
        href: "/admin/emails",
        label: "Bulk Emails",
        accent: SECTION_ACCENT.emails,
        icon: Mail,
        exact: false,
        keywords: ["resend", "campaign", "audience", "newsletter", "payment confirmation"],
      },
    ],
  },
];

/** Flat view of the same data, for anything that walks every entry at once. */
export const ADMIN_NAV_ENTRIES: AdminNavEntry[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.entries,
);

/**
 * The panel's actions and exits. Not sections, so they wear no hue: they belong at
 * the foot of the rail and at the foot of the palette, below the colour legend.
 */
export const ADMIN_ACTIONS: (AdminNavEntry & { external?: boolean })[] = [
  {
    href: "/admin/reports/brief",
    label: "Print a report",
    accent: SECTION_ACCENT.dashboard,
    icon: Printer,
    exact: false,
    keywords: [
      "export",
      "pdf",
      "paper",
      "summary",
      "brief",
      "forecast",
      "trend",
      "schools",
      "referrers",
    ],
  },
  {
    href: "/cms",
    label: "CMS Studio",
    accent: SECTION_ACCENT.dashboard,
    icon: PenSquare,
    exact: false,
    keywords: ["pages", "content", "edit site"],
  },
  {
    href: "/",
    label: "View site",
    accent: SECTION_ACCENT.dashboard,
    icon: ExternalLink,
    exact: false,
    external: true,
    keywords: ["public site", "open", "homepage"],
  },
];

/** Every entry the palette can offer, in the order it offers them. */
export const PALETTE_TARGETS = [...ADMIN_NAV_ENTRIES, ...ADMIN_ACTIONS];
