/* Edit this array to define the home page cards. Each entry renders as a
   full-height stacked card in the divisions section. */

export interface HomeCard {
  id: string;
  title: string;
  description: string;
  focus: string[];
  memberCount: number;
  openPositions: number;
}

export const homeCards: HomeCard[] = [
  {
    id: "team-robotics",
    title: "Robotics Division",
    description:
      "Designs, builds, and programs autonomous and semi-autonomous robotic systems for environmental, mechanical, and competitive applications.",
    focus: ["Arduino / Microcontrollers", "Sensor Systems", "Control Logic", "3D Printing"],
    memberCount: 18,
    openPositions: 3,
  },
  {
    id: "team-research",
    title: "Research & Publication Wing",
    description:
      "Produces the bimonthly MSC Research Journal, manages peer review, and represents the club in academic writing competitions.",
    focus: ["Academic Writing", "Peer Review", "Literature Research", "Data Analysis"],
    memberCount: 14,
    openPositions: 4,
  },
  {
    id: "team-astronomy",
    title: "Astronomy & Space Division",
    description:
      "Operates telescope sessions, participates in astronomy olympiads, and is currently building a small radio telescope array.",
    focus: ["Astrophysics", "Telescope Operation", "Radio Astronomy", "Cosmology"],
    memberCount: 11,
    openPositions: 2,
  },
  {
    id: "team-chemistry",
    title: "Chemistry Lab Division",
    description:
      "Conducts structured experiments in organic, inorganic, and electrochemistry. Leads the annual Chemistry Open Day demonstrations.",
    focus: ["Organic Chemistry", "Electrochemistry", "Lab Safety", "Titration & Analysis"],
    memberCount: 15,
    openPositions: 3,
  },
  {
    id: "team-biology",
    title: "Biology Field Division",
    description:
      "Focuses on ecological fieldwork, cell biology experiments, and has an active partnership with the school's botany garden.",
    focus: ["Ecology & Fieldwork", "Cell Biology", "Botany", "Microscopy"],
    memberCount: 12,
    openPositions: 2,
  },
  {
    id: "team-editorial",
    title: "Editorial & Design Board",
    description:
      "Manages club communications, social media, visual design, and publication layout for the MSC Research Journal.",
    focus: ["Graphic Design", "Science Communication", "Social Media", "Typography"],
    memberCount: 8,
    openPositions: 2,
  },
];
