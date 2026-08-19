export interface StemfestSegment {
  id: string;
  index: string;
  title: string;
  description: string;
  items: string[];
}

/* Edit this array to change the STEM Fest segment sequence
   revealed inside the hero tesseract dive. */
export const stemfestSegments: StemfestSegment[] = [
  {
    id: "olympiads",
    index: "01",
    title: "Olympiads",
    description: "Five arenas of head-to-head academic combat. One champion per track.",
    items: [
      "Mathematics",
      "Bio-Chem",
      "General Science",
      "Computer Science",
      "Robotics: Robosoccer / LFR / Roborace",
    ],
  },
  {
    id: "project-display",
    index: "02",
    title: "Project Display",
    description:
      "Every division puts its work on the floor. Prototypes, papers and live demos, judged in person.",
    items: [],
  },
  {
    id: "esports",
    index: "03",
    title: "E-sports",
    description: "The arena goes digital. Three titles, open brackets, crowns on stage.",
    items: ["EA FC 26", "Clash Royale", "Minecraft Bedwars (Solos)"],
  },
  {
    id: "fun-segment",
    index: "04",
    title: "Fun Segment",
    description: "Two days, all classes. The whole campus becomes the game board.",
    items: [
      "Treasure Hunt",
      "Quiz",
      "Pinata",
      "Tic Tac Toe",
      "Battleship",
      "Boxing Machine",
    ],
  },
];
