/**
 * Copy for the `/rules` page — the club's official *Dress Code & Identification
 * Guidelines* for STEM Fest 2026, reproduced verbatim.
 *
 * The page renders this as a plain document (no rule cards), so wording changes
 * happen here and never in the component. Nothing in here is derived or
 * computed: these are the Organising Committee's stated guidelines.
 */

export interface DressCodeGroup {
  /** Stable key, also the React key. */
  id: string;
  /** Audience heading, exactly as the committee wrote it. */
  heading: string;
  /** The guideline for that audience. */
  text: string;
}

export const eventRulesCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "STEM Fest 2026 – Dress Code & Identification Guidelines",
  intro:
    "To ensure a disciplined and professional environment throughout the STEM Fest, all participants and visitors are requested to follow the guidelines below:",
  closing:
    "Your cooperation in maintaining a disciplined, respectful, and welcoming environment is highly appreciated.",
  thanks: "Thank you for your cooperation.",
  signOff: {
    committee: "STEM Fest Organising Committee",
    institution: "Manarat Dhaka International School and College (MDIC)",
  },
} as const;

export const dressCodeGroups: DressCodeGroup[] = [
  {
    id: "mdic-students-participants",
    heading: "MDIC Students & Participants:",
    text: "All MDIC students and participants must wear the complete school uniform and carry their valid school ID card.",
  },
  {
    id: "non-mdic-student-participants",
    heading: "Non-MDIC Student Participants:",
    text: "All participants from other schools must wear their respective school uniform and carry their valid school ID card.",
  },
  {
    id: "private-candidates",
    heading: "Private Candidates:",
    text: "Private candidates are requested to wear decent and appropriate attire and carry valid identification, where applicable.",
  },
  {
    id: "parents-visitors",
    heading: "Parents & Visitors:",
    text: "All MDIC and non-MDIC parents and visitors are requested to wear decent, modest, and appropriate attire suitable for a school event.",
  },
];
