// ─── Site Config ──────────────────────────────────────────────────────────────

export const siteConfig = {
  name: "Manarat Science Club",
  shortName: "MSC",
  tagline: "Where curiosity meets creativity",
  address: "Manarat Dhaka International School & College, Gulshan, Dhaka-1212",
  email: "manaratscienceclub@gmail.com",
  phone: "+8801920522197",
  bugReportUrl: "mailto:manaratscienceclub@gmail.com?subject=Bug%20Report%20%7C%20MSC%20Website",
  social: {
    instagram: "https://www.instagram.com/manaratscience",
    discord: " https://discord.gg/FTHAkQcSHJ",
    facebook: "https://www.facebook.com/manaratscienceclub",
    boysCommunity: "https://chat.whatsapp.com/Eyja5DTaDmYAotXkQQsCl4?s=cl&p=i&mlu=1",
    girlsCommunity: "https://chat.whatsapp.com/F8bNUetkCdX8dsIDmXq7vi?s=cl&p=i&mlu=1",
  },
  developer: "Abrar Jawad - B25",
  foundedYear: 2023,
};

// ─── Metrics ──────────────────────────────────────────────────────────────────

export const metrics = { members: 500, activeTeams: 6, completedProjects: 43, accolades: 18 };

// ─── Leadership ───────────────────────────────────────────────────────────────

export interface LeadershipMember {
  id: string;
  name: string;
  designation: string;
  role: "faculty-advisor" | "president";
  image?: string | null;
  quote: string;
  dedication?: string;
}

export const leadership: LeadershipMember[] = [
  {
    id: "advisor-1",
    name: "Dr. Fahmida Islam",
    designation: "Senior Physics Lecturer & Club In-Charge",
    role: "faculty-advisor",
    image: null,
    quote: "Science education begins not with answers, but with the courage to ask the right questions. At Manarat Science Club, we cultivate that courage, nurture curiosity, and produce students who are not just academically sound, but scientifically literate citizens of tomorrow.",
  },
  {
    id: "advisor-2",
    name: "Mr. Rafiqul Hasan",
    designation: "Head of Biology Department & Club Supervisor",
    role: "faculty-advisor",
    image: null,
    quote: "In every cell, every atom, every reaction — there is a lesson waiting to be discovered. This club is where those lessons come alive outside the textbook. We believe in learning by doing, questioning by observing, and growing through collaboration.",
  },
  {
    id: "president",
    name: "Tariq Ziad Mahmud",
    designation: "Club President, Batch 2025–26",
    role: "president",
    image: null,
    dedication: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\n\"Read! In the name of your Lord who created — created man from a clinging substance. Read, and your Lord is the most Generous, who taught by the pen, taught man that which he knew not.\"\n— Surah Al-ʿAlaq (96:1–5)",
    quote: "Manarat Science Club is more than a club — it is a promise we make to each other. A promise to keep learning, to keep questioning, and to carry knowledge forward in service of something greater than ourselves. Every experiment we run, every paper we publish, every project we complete is a small act of devotion to that promise.",
  },
];

// ─── Events ───────────────────────────────────────────────────────────────────

export interface ClubEvent {
  id: string; title: string; date: string; time: string;
  description: string; status: "upcoming" | "past"; location: string; tags: string[];
}

export const events: ClubEvent[] = [
  { id: "evt-001", title: "Quantum Mechanics Workshop", date: "2026-07-12", time: "10:00 AM", description: "An introductory hands-on workshop on quantum mechanics concepts, wave-particle duality, and the double-slit experiment. Suitable for students in grades 9–12.", status: "upcoming", location: "Physics Lab, Main Building", tags: ["physics", "workshop"] },
  { id: "evt-002", title: "Robotics Team Showcase", date: "2026-07-25", time: "2:00 PM", description: "Members of the Robotics Division will demonstrate semester projects including the environmental monitoring robot and the automated greenhouse system.", status: "upcoming", location: "Auditorium, Manarat Campus", tags: ["robotics", "showcase"] },
  { id: "evt-003", title: "Annual Science Fair 2026", date: "2026-08-15", time: "9:00 AM", description: "The flagship annual event where all MSC divisions present their research, experiments, and prototypes to faculty, industry judges, and invited guests.", status: "upcoming", location: "Main Hall & Grounds", tags: ["science-fair", "annual"] },
  { id: "evt-004", title: "Bimonthly Journal Launch — Vol. 3", date: "2026-05-20", time: "11:00 AM", description: "Launch ceremony for Volume 3 of the MSC Research Journal, featuring 8 peer-reviewed student articles covering quantum physics to environmental biology.", status: "past", location: "Library Conference Room", tags: ["journal", "publication"] },
  { id: "evt-005", title: "National Science Olympiad — Regional Round", date: "2026-04-08", time: "8:30 AM", description: "Manarat teams competed in the Regional Science Olympiad, achieving top-3 finishes in Physics and Biology categories.", status: "past", location: "Bangladesh University of Engineering & Technology (BUET)", tags: ["olympiad", "competition"] },
  { id: "evt-006", title: "Chemistry Lab Open Day", date: "2026-03-05", time: "1:00 PM", description: "A public demonstration day featuring electrochemistry experiments, paper chromatography, and a demonstration of bioluminescence using analog reagents.", status: "past", location: "Chemistry Lab, Second Floor", tags: ["chemistry", "demonstration"] },
];

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: string; title: string; eventName: string; year: number;
  tier: "gold" | "silver" | "bronze" | "merit";
  category: "science-fair" | "quiz" | "olympiad" | "exhibition";
  description: string;
}

export const achievements: Achievement[] = [
  { id: "ach-001", title: "1st Place — Physics Olympiad", eventName: "Bangladesh National Science Olympiad", year: 2025, tier: "gold", category: "olympiad", description: "Tariq Ziad Mahmud secured first place in the Physics category, solving a complex quantum harmonic oscillator problem set under timed conditions." },
  { id: "ach-002", title: "Best Environmental Project", eventName: "Dhaka Inter-School Science Fair", year: 2025, tier: "gold", category: "science-fair", description: "The Robotics team's Environmental Monitoring Robot won the top prize in the Environmental Solutions category for innovation and practical impact." },
  { id: "ach-003", title: "2nd Place — Biology Quiz", eventName: "National Biology Olympiad — Regional", year: 2025, tier: "silver", category: "quiz", description: "MSC's Biology team scored second in a 120-question rapid-fire quiz covering genetics, ecology, and cell biology." },
  { id: "ach-004", title: "3rd Place — Prototype Exhibition", eventName: "Innovate Bangladesh 2024", year: 2024, tier: "bronze", category: "exhibition", description: "The automated vertical hydroponic garden prototype earned a third-place innovation award at the national youth technology exhibition." },
  { id: "ach-005", title: "1st Place — Interdisciplinary Research Paper", eventName: "SESIP Young Researchers Competition", year: 2024, tier: "gold", category: "science-fair", description: "Samia Begum and Farhan Ahmed co-authored the winning paper on neuroscience-backed study methodologies in Bangladeshi secondary schools." },
  { id: "ach-006", title: "Best Chemistry Experiment", eventName: "Manarat Science Day 2024", year: 2024, tier: "gold", category: "exhibition", description: "The electrochemical water purification experiment was recognized as the most technically rigorous and practically applicable project." },
  { id: "ach-007", title: "2nd Place — Astronomy Quiz", eventName: "South Asian Astronomy Youth Challenge", year: 2023, tier: "silver", category: "quiz", description: "The Astronomy Division team placed second in a 3-round quiz covering stellar physics, exoplanet detection, and cosmological models." },
  { id: "ach-008", title: "Merit Certificate — Robotics", eventName: "IEEE Bangladesh Student Branch Competition", year: 2023, tier: "merit", category: "exhibition", description: "MSC received a merit certificate for the line-following and obstacle-detecting robot demonstration at the IEEE robotics challenge." },
];

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface EngineeringTeam {
  id: string; name: string; description: string;
  memberCount: number; openPositions: number; focus: string[]; color: string;
}

export const teams: EngineeringTeam[] = [
  { id: "team-robotics", name: "Robotics Division", description: "Designs, builds, and programs autonomous and semi-autonomous robotic systems for environmental, mechanical, and competitive applications.", memberCount: 18, openPositions: 3, focus: ["Arduino / Microcontrollers", "Sensor Systems", "Control Logic", "3D Printing"], color: "manara-teal" },
  { id: "team-research", name: "Research & Publication Wing", description: "Produces the bimonthly MSC Research Journal, manages peer review, and represents the club in academic writing competitions.", memberCount: 14, openPositions: 4, focus: ["Academic Writing", "Peer Review", "Literature Research", "Data Analysis"], color: "manara-purple" },
  { id: "team-astronomy", name: "Astronomy & Space Division", description: "Operates telescope sessions, participates in astronomy olympiads, and is currently building a small radio telescope array.", memberCount: 11, openPositions: 2, focus: ["Astrophysics", "Telescope Operation", "Radio Astronomy", "Cosmology"], color: "manara-blue" },
  { id: "team-chemistry", name: "Chemistry Lab Division", description: "Conducts structured experiments in organic, inorganic, and electrochemistry. Leads the annual Chemistry Open Day demonstrations.", memberCount: 15, openPositions: 3, focus: ["Organic Chemistry", "Electrochemistry", "Lab Safety", "Titration & Analysis"], color: "manara-yellow" },
  { id: "team-biology", name: "Biology Field Division", description: "Focuses on ecological fieldwork, cell biology experiments, and has an active partnership with the school's botany garden.", memberCount: 12, openPositions: 2, focus: ["Ecology & Fieldwork", "Cell Biology", "Botany", "Microscopy"], color: "manara-pink" },
  { id: "team-editorial", name: "Editorial & Design Board", description: "Manages club communications, social media, visual design, and publication layout for the MSC Research Journal.", memberCount: 8, openPositions: 2, focus: ["Graphic Design", "Science Communication", "Social Media", "Typography"], color: "ink" },
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string; title: string; description: string; team: string;
  status: "completed" | "ongoing"; materials: string[]; goals: string[]; members: string[];
}

export const projects: Project[] = [
  { id: "proj-001", title: "Autonomous Environmental Monitoring Robot", description: "A self-navigating robot equipped with air quality, temperature, humidity, and soil pH sensors, designed to patrol and log environmental data in urban green spaces.", team: "Robotics Division", status: "completed", materials: ["Arduino Mega", "MQ-135 Sensor", "DHT22", "L298N Motor Driver", "LiPo Battery", "3D-Printed Chassis"], goals: ["Automate environmental data collection", "Demonstrate practical robotics in ecology", "Achieve 2.5-hour autonomous runtime"], members: ["Nadia Rahman", "Khalid Hassan", "Mariam Akter"] },
  { id: "proj-002", title: "Vertical Hydroponic Garden System", description: "An automated vertical hydroponic system using recirculating nutrient solution, timed LED grow lights, and automated pH correction — designed for urban food production.", team: "Biology Field Division", status: "ongoing", materials: ["PVC Pipes", "Water Pump", "pH Sensor", "Nutrient Solution", "LED Grow Lights", "Arduino Nano"], goals: ["Grow leafy vegetables without soil in limited space", "Automate nutrient and pH monitoring", "Demonstrate urban food security innovation"], members: ["Samia Begum", "Fatima Tuz Zohra", "Rahim Uddin"] },
  { id: "proj-003", title: "Electrochemical Water Purification Device", description: "A small-scale electrochemical reactor that uses electrolysis to remove heavy metal contaminants and pathogens from drinking water without chemical additives.", team: "Chemistry Lab Division", status: "completed", materials: ["Graphite Electrodes", "Stainless Steel Chamber", "DC Power Supply", "pH Meter", "Conductivity Probe"], goals: ["Remove 90%+ of heavy metals from contaminated samples", "Design for low-cost community replication", "Document full experimental protocol for publication"], members: ["Farhan Ahmed", "Tasneem Akter", "Amir Khan"] },
  { id: "proj-004", title: "Radio Telescope Array — Phase 1", description: "Construction of a small-baseline radio interferometer array using repurposed satellite dishes and RTL-SDR receivers to detect 21cm hydrogen line emission from the Milky Way.", team: "Astronomy & Space Division", status: "ongoing", materials: ["Repurposed Satellite Dishes (×3)", "RTL-SDR Receivers", "Raspberry Pi 4", "Low-Noise Amplifiers", "Coaxial Cable"], goals: ["Detect 21cm hydrogen line emission", "Map a section of the galactic plane", "Build an open-source analysis pipeline"], members: ["Tariq Ziad Mahmud", "Sakib Mahmud", "Labiba Islam"] },
];

// ─── Legacy Content ───────────────────────────────────────────────────────────

// ─── Members ───────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  image: string;
  batch: string;
  role: string;
  socials: {
    instagram?: string;
    facebook?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

export const currentMembers: Member[] = [
  {
    id: "current-ajmain",
    name: "Mohammad Ajmain Faieq",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/ajmain.png",
    batch: "2026–2027",
    role: "President",
    socials: {},
  },
  {
    id: "current-yasa",
    name: "Yasa Rahman",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/yasa.jpg",
    batch: "2026–2027",
    role: "General Secretary",
    socials: {},
  },
  {
    id: "current-zarifah",
    name: "Zarifah Tasnim",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/zarifa.jpg",
    batch: "2026–2027",
    role: "General Secretary",
    socials: {},
  },
    {
    id: "current-nureen",
    name: "Nureen Rayan",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/nureen.jpg",
    batch: "2026–2027",
    role: "Head of Department — Activity",
    socials: {},
  },
  {
    id: "current-nusaiba",
    name: "Nusaiba Farha",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/nusaiba.png",
    batch: "2026–2027",
    role: "Head of Department — Activity",
    socials: {},
  },
  {
    id: "current-alfe",
    name: "Shafe Islam Alfe",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/shafe.jpg",
    batch: "2026–2027",
    role: "Creative Director",
    socials: {},
  },
  {
    id: "current-aarina",
    name: "Aarina Moitry",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/aarina.jpg",
    batch: "2026–2027",
    role: "Head of Department — Media",
    socials: {},
  },
  {
    id: "current-ruhma",
    name: "Ruhma Hossain",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/ruhma.jpg",
    batch: "2026–2027",
    role: "Head of Department — Academics",
    socials: {},
  },
  {
    id: "current-safwan",
    name: "Sazid Hasan Safwan",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/safwan.jpg",
    batch: "2026–2027",
    role: "Head of Department — Academics",
    socials: {},
  },
    {
    id: "current-abrar",
    name: "Abrar Jawad",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/abrar.png",
    batch: "2026–2027",
    role: "Head of Department — IT",
    socials: {},
  },
  {
    id: "current-tahiad",
    name: "Mohammad Tahiad Islam",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/tahiad.jpg",
    batch: "2026–2027",
    role: "Head of Department — Engineering & Innovation",
    socials: {},
  },

];

export const legacyMembers: Member[] = [
  {
    id: "current-jaif",
    name: "Jaif Bin Morshed",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/jaif.png",
    batch: "2025–2026",
    role: "President",
    socials: {},
  },
  {
    id: "current-ajmain",
    name: "Mohammad Ajmain Faieq",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/ajmain.jpg",
    batch: "2025–2026",
    role: "Vice President",
    socials: {},
  },
  {
    id: "current-nureen",
    name: "Nureen Rayan",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/nureen.png",
    batch: "2025–2026",
    role: "Vice President",
    socials: {},
  },
  {
    id: "current-fariha",
    name: "Fariha Tasnim",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/fariha.png",
    batch: "2025–2026",
    role: "General Secretary",
    socials: {},
  },
  {
    id: "current-yasa",
    name: "Yasa Rahman",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/yasa.jpg",
    batch: "2025–2026",
    role: "Assistant Secretary",
    socials: {},
  },
  {
    id: "current-twaha-senior",
    name: "Samin Yasar Twaha",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/twaha.jpg",
    batch: "2025–2026",
    role: "Senior Executive",
    socials: {},
  },
  {
    id: "current-farheen-senior",
    name: "Farheen Hasnat",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/farheen.png",
    batch: "2025–2026",
    role: "Senior Executive",
    socials: {},
  },
  {
    id: "current-takrim",
    name: "Takrim Areefin",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/takrim.png",
    batch: "2025–2026",
    role: "Deputy Coordinator",
    socials: {},
  },
  {
    id: "current-nusaiba",
    name: "Nusaiba Farha",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/nusaiba.png",
    batch: "2025–2026",
    role: "Deputy Coordinator",
    socials: {},
  },

  {
    id: "current-golam",
    name: "Golam Sami",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/golamsami.jpg",
    batch: "2025–2026",
    role: "Creativity HOD",
    socials: {},
  },
  {
    id: "current-kashfee",
    name: "Kashfee Rahman",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/kashfee.png",
    batch: "2025–2026",
    role: "Creativity HOD",
    socials: {},
  },
  {
    id: "current-tamim",
    name: "Tamim Iqbal",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/tamimiqbal.jpg",
    batch: "2025–2026",
    role: "Media HOD",
    socials: {},
  },
  {
    id: "current-maisha",
    name: "Maisha Siddiqua",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/maisha.png",
    batch: "2025–2026",
    role: "Creative Director",
    socials: {},
  },
  {
    id: "current-nabiha",
    name: "Nabiha Zaman",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/nabiha.png",
    batch: "2025–2026",
    role: "Activity HOD",
    socials: {},
  },
  {
    id: "current-farheen-activity",
    name: "Farheen Hasnat",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/farheen.png",
    batch: "2025–2026",
    role: "Activity HOD",
    socials: {},
  },
  {
    id: "current-twaha-events",
    name: "Samin Yasar Twaha",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/twaha.jpg",
    batch: "2025–2026",
    role: "Events HOD",
    socials: {},
  },
  {
    id: "current-abrar",
    name: "Abrar Jawad",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/abrar.png",
    batch: "2025–2026",
    role: "IT HOD",
    socials: {},
  },
  {
    id: "current-dhrubo",
    name: "Dhrubo Hasan",
    image: "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/avatars/adminimages/dhrubo.png",
    batch: "2025–2026",
    role: "Engineering & Innovation HOD",
    socials: {},
  },
];

// Boilerplate for 2026–2027 edition
export const nextGenMembers: Member[] = [];

export const legacyContent = `## Our Beginning

Manarat Science Club was founded in 2019 by a small group of students and two faculty members who believed that science should not be confined to textbooks and examination halls. In our first year, MSC operated with 12 founding members, one chemistry demonstration event, and a four-page newsletter printed on the school copier.

## Growing Through Adversity

The 2020–2021 period tested every institution globally. MSC adapted by launching its first digital journal and hosting virtual science discussions. Membership grew counter-intuitively during this period, as students found in MSC a community of intellectual engagement. By 2021, we had 67 active members across five informal divisions.

## Structural Maturation (2022–2023)

In 2022, MSC underwent its first formal structural reorganization. The informal groups became official divisions — Robotics, Research & Publication, Astronomy, Chemistry, Biology, and Editorial — each with elected team leads and a defined charter.

The MSC Research Journal was formalized into a bimonthly publication with a peer-review process. Volume 1, Issue 1 launched in March 2022 and featured seven student-authored articles.

2023 marked our first national competition appearance. The Astronomy Division team placed second in the South Asian Astronomy Youth Challenge — a result that proved that student-run science initiatives in Bangladesh could compete at a high level.

## The Modern Era (2024–Present)

By 2024, MSC had grown to over 200 members, formalized its leadership structure with a student President and Vice-Presidents per division, and established a formal faculty advisory board.

In 2025, MSC achieved its most significant accolades to date — a first-place finish at the Bangladesh National Science Olympiad (Physics) and a best-project award at the Dhaka Inter-School Science Fair.

## Philosophy

MSC has always operated on a core belief: that young people, given the right structure and mentorship, are capable of genuine scientific contribution. We do not simulate science — we practice it. Our journals are peer-reviewed. Our experiments follow proper protocols. Our robots run in the real world.

## Looking Ahead

As we move toward 2027, MSC's roadmap includes:
- Completing Phase 1 of the Radio Telescope Array
- Publishing Volume 5 of the MSC Research Journal
- Expanding the Biology Division's vertical farming project to a rooftop installation
- Hosting the first inter-school MSC Science Symposium
- Establishing an alumni mentorship network`;
