/**
 * Copy for the STEM Fest volunteer application form
 * (`src/app/(routes)/(site)/register/volunteer-form.tsx`).
 *
 * Everything the volunteer form says lives here — edit the text, the question
 * order or the section split without touching the component.
 */

export interface VolunteerQuestion {
  /** Matches the react-hook-form field name and the Zod schema key. */
  id: VolunteerQuestionId;
  label: string;
  hint?: string;
  placeholder?: string;
  /** "half" packs two short fields onto one row; "full" (default) is a row alone. */
  span?: "full" | "half";
}

export type VolunteerQuestionId =
  | "fullName"
  | "classSection"
  | "roll"
  | "shift"
  | "studentCode"
  | "address"
  | "personalPhone"
  | "parentsPhone"
  | "attendanceWeek"
  | "parentsComfort"
  | "campusHesitation"
  | "scenarioTaskConflict"
  | "scenarioPeerConduct"
  | "selectionReason";

/** Paragraphs shown above the form, in order. */
export const volunteerIntroParagraphs: string[] = [
  "STEM Fest celebrates innovation, creativity, and curiosity in Science, Technology, Engineering, and Mathematics through interactive exhibits, presentations, and activities 🔬💡🚀.",
  "Volunteering offers valuable experience in teamwork, leadership, communication, and problem-solving while building confidence and responsibility 🤝🌟. All selected volunteers will receive an official certificate 📜 and gain meaningful experiences, connections, and skills for future opportunities.",
  "We look forward to welcoming dedicated and enthusiastic volunteers to help make STEM Fest a success 🎉🙌.",
];

export interface VolunteerFormSection {
  step: string;
  title: string;
  caption: string;
  questions: VolunteerQuestion[];
}

export const volunteerFormSections: VolunteerFormSection[] = [
  {
    step: "01",
    title: "Your details",
    caption: "Who you are and where we can find you on campus.",
    questions: [
      {
        id: "fullName",
        label: "Name",
      },
      {
        id: "classSection",
        label: "Class section",
        span: "half",
      },
      {
        id: "roll",
        label: "Roll",
        span: "half",
      },
      {
        id: "shift",
        label: "Shift",
        hint: "Morning / Day as printed on your ID card.",
        span: "half",
      },
      {
        id: "studentCode",
        label: "Student code",
        span: "half",
      },
    ],
  },
  {
    step: "02",
    title: "How to reach you",
    caption: "Your address and the two numbers we may need to call.",
    questions: [
      {
        id: "address",
        label: "Address",
      },
      {
        id: "personalPhone",
        label: "Personal phone no",
        span: "half",
      },
      {
        id: "parentsPhone",
        label: "Parents phone no",
        span: "half",
      },
    ],
  },
  {
    step: "03",
    title: "Availability & consent",
    caption: "The two fest days are long — make sure the timing works for you.",
    questions: [
      {
        id: "attendanceWeek",
        label:
          "Are you able to attend and present your full presence in the week following the two stem fest days? (Any clashes with classes/ events need to be mentioned)",
      },
      {
        id: "parentsComfort",
        label:
          "Are your parents comfortable with you spending long hours at the school during these days? (6AM to 7PM on stem fest days)",
      },
      {
        id: "campusHesitation",
        label:
          "Is there any hesitation or nervousness you might feel staying long hours at the campus?",
      },
    ],
  },
  {
    step: "04",
    title: "On the ground",
    caption: "How you handle people, pressure, and the job in front of you.",
    questions: [
      {
        id: "scenarioTaskConflict",
        label:
          "You are given a task, but another volunteer tells you to do something else. What do you do?",
      },
      {
        id: "scenarioPeerConduct",
        label:
          "You notice another volunteer not doing their job properly. How would you respond?",
      },
      {
        id: "selectionReason",
        label: "Why should we select you as a volunteer for STEM Fest?",
      },
    ],
  },
];

/** Field names that render as multi-line textareas. */
export const volunteerTextareaFields: VolunteerQuestionId[] = [
  "address",
  "attendanceWeek",
  "parentsComfort",
  "campusHesitation",
  "scenarioTaskConflict",
  "scenarioPeerConduct",
  "selectionReason",
];

/** Short label used by the progress rail so long questions still fit. */
export const volunteerChecklistLabels: Record<VolunteerQuestionId, string> = {
  fullName: "Name",
  classSection: "Class section",
  roll: "Roll",
  shift: "Shift",
  studentCode: "Student code",
  address: "Address",
  personalPhone: "Personal phone no",
  parentsPhone: "Parents phone no",
  attendanceWeek: "Follow-up week",
  parentsComfort: "Parents' consent",
  campusHesitation: "Hesitation",
  scenarioTaskConflict: "Task clash",
  scenarioPeerConduct: "Peer conduct",
  selectionReason: "Why you",
};

export const volunteerFormCopy = {
  eyebrow: "STEM Fest volunteer application",
  heading: "Volunteer for STEM Fest",
  subheading:
    "Fourteen short answers — about three minutes of your time. Everything you type is saved as you go, so you can close the tab and finish later.",
  submitLabel: "Submit volunteer application",
  confirmation: "You have already applied to volunteer for STEM Fest.",
  disclaimer:
    "By submitting, you agree to be contacted by the Manarat Science Club regarding your application. We never share your data with third parties.",
} as const;
