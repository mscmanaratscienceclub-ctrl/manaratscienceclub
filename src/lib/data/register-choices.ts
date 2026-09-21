/**
 * Copy for the `/register` chooser — the fork between the STEM Fest event
 * registration and the STEM Fest volunteer application.
 *
 * The page itself only reads this: edit wording, order or the eligibility
 * badge here without touching the component.
 */

export interface RegistrationChoice {
  /** Stable key, also used as the React key. */
  id: "stemfest" | "volunteer";
  title: string;
  description: string;
  /** Short points shown under the description. */
  points: string[];
  ctaLabel: string;
  href: string;
  /**
   * Hover/focus detail, shown from the info button beside the title. Kept short:
   * it fills the gaps the card leaves out (eligibility, what happens next),
   * rather than repeating the description above it.
   */
  tooltip: string;
  /**
   * Eligibility flag rendered as a bold badge on the card. Absent means the
   * option is open to everyone.
   */
  badge?: string;
  /** Longer note printed under the badge. */
  eligibilityNote?: string;
}

export const registrationChoiceCopy = {
  eyebrow: "Registration",
  heading: "How do you want to take part?",
  subheading:
    "Two ways in. Register a team for the STEM Fest events, or apply to volunteer on the ground during the fest.",
} as const;

/**
 * The rules pointer that sits under both cards.
 *
 * Deliberately shared rather than repeated per card: the dress code and venue
 * instructions apply to everyone at the fest, so they are stated once, below the
 * fork, instead of implying that one path has rules and the other doesn't.
 */
export const registrationRulesLink = {
  label: "Event rules",
  description:
    "Dress code, what may be brought through the gate, entry timing and where to enter.",
  ctaLabel: "Read the rules",
  href: "/rules",
} as const;

export const registrationChoices: RegistrationChoice[] = [
  {
    id: "stemfest",
    title: "STEM Fest Registration",
    description:
      "Enter the competitions — Olympiads, Robotics, Project Display and E-sports. Pick your class and events, then confirm your bKash payment.",
    points: [
      "Olympiads and E-sports in every class",
      "Robotics (LFR & Robosoccer) squads for Class 7 to university",
      "Project Display for Class 9 and above",
    ],
    ctaLabel: "Register for STEM Fest",
    href: "/stemfestreg",
    tooltip:
      "Open to Class 3 through university. Pick your class and events, pay the total by bKash, then submit the TrxID — your slots are confirmed once the payment is matched. Uniforms, ID cards and the event rules apply on the day.",
  },
  {
    id: "volunteer",
    title: "Volunteer",
    description:
      "Run the fest from the floor — manage exhibits, guide visitors and keep the two days moving. Selected volunteers receive an official certificate.",
    points: [
      "Open during both STEM Fest days",
      "Certificate for every selected volunteer",
      "On-campus roles across all departments",
    ],
    ctaLabel: "Apply to volunteer",
    href: "/volunteer",
    tooltip:
      "Manarat students only. You must be available across both fest days, so tell us your classes and any club commitments in the form. Selected volunteers are assigned a role before the event and receive a certificate.",
    badge: "MANARAT ONLY",
    eligibilityNote:
      "Volunteer applications are accepted from Manarat students only.",
  },
];
