/**
 * Copy for the `/rules` page — what participants and visitors need to know on
 * the day: dress code and venue instructions.
 *
 * The page renders this verbatim, so wording changes (including a new rule, or
 * reordering one) happen here and never in the component. Nothing in here is
 * derived or computed: these are the club's stated rules.
 */

export type EventRuleIconId =
  | "uniform"
  | "id-card"
  | "dress"
  | "mail"
  | "contraband"
  | "phone"
  | "exit"
  | "breaks"
  | "gate"
  | "participant-id";

export interface EventRule {
  /** Stable key, also the React key. */
  id: string;
  /** Icon looked up in the page's `RULE_ICONS` map. */
  icon: EventRuleIconId;
  text: string;
  /**
   * `"alert"` gives the rule the accent treatment. Used only for the contraband
   * line, which is the one rule with consequences attached.
   */
  tone?: "default" | "alert";
}

export interface EventRuleGroup {
  /** Stable key, also the React key. */
  id: "dress-code" | "instructions";
  /** Zero-padded index printed beside the heading. */
  index: string;
  heading: string;
  lead: string;
  rules: EventRule[];
}

export const eventRulesCopy = {
  eyebrow: "STEM Fest · Manarat Science Club",
  heading: "Event rules",
  subheading:
    "Read these before you arrive. They cover what to wear, what you may bring through the gate, how your participant ID reaches you, and how the day runs for participants and visitors alike.",
  note: "Rules apply for the full duration of the fest. Club volunteers and campus security may ask you to leave the venue if a rule is broken.",
} as const;

export const eventRuleGroups: EventRuleGroup[] = [
  {
    id: "dress-code",
    index: "01",
    heading: "Dress code",
    lead: "Uniforms and ID cards are how we tell participants from visitors on the floor.",
    rules: [
      {
        id: "uniforms",
        icon: "uniform",
        text: "Participants from all schools must wear uniforms and carry their respective ID cards.",
      },
      {
        id: "mdic-visitors",
        icon: "id-card",
        text: "All visiting students from MDIC must wear their uniforms and ID cards while visiting.",
      },
      {
        id: "other-visitors",
        icon: "dress",
        text: "Private students and other visitors are required to maintain decent clothing.",
      },
    ],
  },
  {
    id: "instructions",
    index: "02",
    heading: "Further instructions",
    lead: "Your participant ID, entry, timing and conduct through the day.",
    rules: [
      {
        id: "participant-id-mail",
        icon: "mail",
        text: "Check your mail for your participant ID — check spam if it is not in your inbox.",
      },
      {
        id: "contraband",
        icon: "contraband",
        text: "No illegal contraband is allowed (eg. vape, cigarette, lighter, pocket knife, etc.).",
        tone: "alert",
      },
      {
        id: "phones",
        icon: "phone",
        text: "Phones are allowed.",
      },
      {
        id: "exit",
        icon: "exit",
        text: "Participants may exit the venue at any time they wish.",
      },
      {
        id: "breaks",
        icon: "breaks",
        text: "Lunch and prayer breaks will be provided as per schedule.",
      },
      {
        id: "gate",
        icon: "gate",
        text: "Gate 1 is allocated for entry.",
      },
      {
        id: "participant-id",
        icon: "participant-id",
        text: "Participant ID will be provided after verification and must be worn at all times.",
      },
    ],
  },
];
