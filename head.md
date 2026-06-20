Act as a Principal Full-Stack Engineer and System Architect. Your task is to generate a comprehensive, multi-page web application for a prestigious high school/college institutional science club ("Manarat Science Club"). 

Focus strictly on information architecture, relational data structures, user workflows, and structural layouts. Do not implement any CSS color variables, font families, custom typography scaling, or decorative design treatments; a separate design system layer will be applied to these semantics later. The Blog system wll implemented by a headless cms later, for now just use static markdown files.
---

### 1. CORE ARCHITECTURE & ROUTING SYSTEM
Implement a multi-page routing layout (SPA or SSR) containing the following dedicated pages, all anchored by a persistent Global Navigation Header and Global Footer.

- [/] Home / Dashboard
- [/legacy] Institutional Legacy
- [/achievements] Accolades & Trophies
- [/blogs] Scientific Research & Articles Hub
- [/blogs/:slug] Dynamic Individual Blog Post Reader
- [/events] Club Events Calendar & Archive
- [/opportunities] Research Teams, Projects & Opening Positions
- [/join] Automated Membership Onboarding Portal

---

### 2. PAGE-BY-PAGE STRUCTURAL BLUEPRINTS

#### A. GLOBAL COMPONENTS
- **Navigation Header:** Brand logo placeholder, Club Name string ("Manarat Science Club / MSC"), dynamic links to all main routes, and a "Join MSC" Call-to-Action button. Include a dynamic bug reporting text link linking to a specific handler.
- **Footer Section:** Three-column breakdown:
  - Column 1: Contact details (Institutional Address, Email, Phone Number).
  - Column 2: Structural Navigation Exploration Links (Direct links to sub-modules like Gallery).
  - Column 3: Communication Platform Matrix (Separate hyperlinked destinations for Instagram, Discord, Facebook, and gender-segregated community groups).
  - Bottom Row: Metadata copyright disclaimer and developer credit strings.

#### B. HOME PAGE [/]
- **Hero Section:** High-impact text layout consisting of a localized welcome phrase, mission declaration ("A club where curiosity meets creativity..."), and a split dual action pathway (e.g., "Explore Projects" and "Join Us").
- **About Sub-section:** A narrative container block detailing the genesis philosophy of the club (focusing on research, bimonthly journals, and interdisciplinary fields like robotics, chemistry, and astronomy).
- **Metric Dashboard Grid:** A 4-column counter/statistic grid displaying live numbers for: General Members, Active Engineering Teams, Completed Projects, and Institutional Accolades.
- **Faculty Editorial / Leadership Board:** A stacked card-based layout featuring profile images, full names, official institutional designations, and long-form blockquote texts for:
  - Faculty Advisor / Club In-Charge 1
  - Faculty Advisor / Club In-Charge 2
  - Club President (Must support a nested layout for a spiritual/philosophical opening dedication followed by a personal leadership greeting statement).
- **Recent Publications Preview:** A dynamic grid fetching the 4 most recent articles from the Blog engine, rendering their cover image space, Title, short summary snippet, and categorized taxonomy tags.
- **Upcoming Events Schedule:** A timeline/calendar card module that conditionally renders a "No upcoming events scheduled" notice or an active chronological list of event dates, times, and descriptions.

#### C. INSTITUTIONAL LEGACY [/legacy]
- **Content Structure:** Long-form markdown-compatible content area detailing the history, founding year, and structural progression of the club over time.

#### D. ACHIEVEMENTS & ACCOLADES [/achievements]
- **Content Structure:** A filterable catalog grid showcasing institutional science fair victories, quiz competition records, Olympiad successes, and prototype exhibitions. Each card requires an image asset container, title, event name, year, and award tier.

#### E. BLOG ENGINE & RESEARCH HUB [/blogs & /blogs/:slug]
- **Index View (/blogs):** Comprehensive listing of all scientific articles. Includes a search bar and tag filtering based on taxonomy (e.g., "biology", "quantum", "neurology").
- **Dynamic Post View (/blogs/:slug):** Clean reader layout containing an article banner image asset, title, metadata bar (date published, author name, reading time estimation), categories list, and a rich text body renderer supporting code blocks, mathematical expressions, or structured sub-headings.

#### F. EVENTS ENGINE [/events]
- **Layout:** Dual view offering: A calendar visualization framework and a sequential linear list of chronological events (split by "Upcoming" and "Past Archive").

#### G. OPPORTUNITIES & PROJECTS TRACKER [/opportunities]
- **Active Engineering Teams Matrix:** Directory displaying current active specialized divisions within the club.
- **Project Repository Grid:** Cards showcasing completed or ongoing innovative prototypes, environmental solutions, and technological models with details on materials, goals, and team members.

#### H. MEMBERSHIP REGISTRATION PORTAL [/join]
- **Layout:** Structured intake multi-step data collection form capturing: Full Name, Institutional ID/Roll Number, Email, Academic Cohort/Year, Fields of Interest (Multi-select: Robotics, Astronomy, Chemistry, Biology, Physics, Editorial), and a Statement of Purpose text field.

---

### 3. TECHNICAL SPECIFICATIONS & OPERATIONAL BEHAVIOR
- **Data State Management:** The blog, events, and metrics sections must pull from a unified relational database or headless CMS API array.
- **Conditional Handling:** Ensure robust structural handling for missing or null data fields (e.g., empty state for events component, fallback placeholders for missing advisor or author profile images).
- **Semantics:** Use standard layout primitives (Semantic HTML like `<header>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`) to ensure structural clarity before styling maps are applied.



Page: Manara Academic Redesign

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manara Science Club — Academic Programs</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Rubik:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['Fredoka', 'Rubik', 'sans-serif'],
            body: ['Rubik', 'sans-serif']
          },
          colors: {
            manaraTeal: '#005f6b',
            manaraYellow: '#ffb703',
            manaraPurple: '#7c3aed',
            manaraPink: '#ec4899',
            manaraBlue: '#60a5fa',
            cream: '#fff8ec',
            ink: '#142326'
          },
          boxShadow: {
            academic: '0 18px 50px rgba(0, 95, 107, 0.12)',
            subtle: '0 10px 30px rgba(20, 35, 38, 0.08)',
            yellow: '0 16px 36px rgba(255, 183, 3, 0.25)'
          }
        }
      }
    }
  </script>
  <style>
    .diagram-grid { background-image: linear-gradient(rgba(0,95,107,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,95,107,.08) 1px, transparent 1px); background-size: 32px 32px; }
    .dot-grid { background-image: radial-gradient(rgba(0,95,107,.14) 1.4px, transparent 1.4px); background-size: 20px 20px; }
    .fade-up { animation: fadeUp .7s ease both; }
    .fade-up-delay { animation: fadeUp .7s ease .12s both; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div class="min-h-screen overflow-hidden bg-cream font-body text-ink">
    <header class="relative z-40 border-b border-manaraTeal/10 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <a id="brand-home-link" href="#home" class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-manaraTeal text-white shadow-subtle">
            <iconify-icon icon="lucide:atom" class="text-3xl"></iconify-icon>
          </div>
          <div>
            <p class="font-display text-xl font-bold leading-none tracking-tight text-manaraTeal">Manara</p>
            <p class="font-display text-lg font-semibold leading-none text-ink">Science Club</p>
          </div>
        </a>
        <nav class="hidden items-center gap-8 font-display text-sm font-semibold text-ink/70 lg:flex">
          <a id="nav-programs-link" href="#programs" class="transition hover:text-manaraTeal">Programs</a>
          <a id="nav-method-link" href="#method" class="transition hover:text-manaraTeal">Method</a>
          <a id="nav-achievements-link" href="#achievements" class="transition hover:text-manaraTeal">Achievements</a>
          <a id="nav-events-link" href="#events" class="transition hover:text-manaraTeal">Events</a>
          <a id="nav-mentors-link" href="#mentors" class="transition hover:text-manaraTeal">Mentors</a>
        </nav>
        <div class="flex items-center gap-3">
          <a id="header-apply-link" href="#enroll" class="hidden rounded-full bg-manaraTeal px-6 py-3 font-display text-sm font-bold text-white shadow-subtle transition hover:-translate-y-0.5 hover:bg-manaraYellow hover:text-manaraTeal md:inline-flex">Apply to Join</a>
          <button class="flex h-12 w-12 items-center justify-center rounded-2xl bg-manaraTeal/10 text-manaraTeal lg:hidden" aria-label="Open menu">
            <iconify-icon icon="lucide:menu" class="text-2xl"></iconify-icon>
          </button>
        </div>
      </div>
    </header>

    <main id="home" class="relative">
      <section class="relative overflow-hidden bg-white">
        <div class="absolute inset-0 diagram-grid opacity-80"></div>
        <div class="absolute right-0 top-0 h-full w-1/3 bg-manaraTeal"></div>
        <div class="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div class="fade-up relative z-10 flex flex-col justify-center">
            <div class="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-manaraTeal/15 bg-cream px-4 py-2 font-display text-sm font-bold text-manaraTeal">
              <iconify-icon icon="lucide:graduation-cap" class="text-lg text-manaraYellow"></iconify-icon>
              Evidence-based science learning for young innovators
            </div>
            <h1 class="max-w-4xl font-display text-5xl font-bold leading-[0.98] tracking-tight text-manaraTeal sm:text-6xl lg:text-7xl">
              Build scientific thinking through structured discovery.
            </h1>
            <p class="mt-7 max-w-2xl text-lg font-medium leading-8 text-ink/70">
              Manara Science Club combines experimentation, computational thinking, research methods, and mentor-led projects to help students transform curiosity into measurable outcomes.
            </p>
            <div class="mt-9 flex flex-col gap-4 sm:flex-row">
              <a id="hero-programs-link" href="#programs" class="inline-flex items-center justify-center gap-3 rounded-full bg-manaraTeal px-8 py-4 font-display text-base font-bold text-white shadow-academic transition hover:-translate-y-1 hover:bg-manaraYellow hover:text-manaraTeal">
                View Academic Tracks
                <iconify-icon icon="lucide:arrow-up-right" class="text-xl"></iconify-icon>
              </a>
              <a id="hero-method-link" href="#method" class="inline-flex items-center justify-center gap-3 rounded-full border border-manaraTeal/20 bg-white px-8 py-4 font-display text-base font-bold text-manaraTeal shadow-subtle transition hover:-translate-y-1 hover:border-manaraYellow">
                See Our Method
                <iconify-icon icon="lucide:microscope" class="text-xl"></iconify-icon>
              </a>
            </div>
            <div class="mt-12 grid max-w-2xl grid-cols-3 overflow-hidden rounded-[2rem] border border-manaraTeal/10 bg-white shadow-subtle">
              <div class="p-5">
                <p class="font-display text-3xl font-bold text-manaraTeal">120+</p>
                <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Projects</p>
              </div>
              <div class="border-x border-manaraTeal/10 p-5">
                <p class="font-display text-3xl font-bold text-manaraPurple">6</p>
                <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Tracks</p>
              </div>
              <div class="p-5">
                <p class="font-display text-3xl font-bold text-manaraPink">92%</p>
                <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Completion</p>
              </div>
            </div>
          </div>

          <div class="fade-up-delay relative z-10 min-h-[560px]">
            <div class="absolute inset-x-0 top-0 mx-auto h-[540px] max-w-[500px] rounded-[3rem] bg-white p-6 shadow-academic">
              <div class="flex items-center justify-between border-b border-manaraTeal/10 pb-5">
                <div>
                  <p class="font-display text-xl font-bold text-manaraTeal">Research Dashboard</p>
                  <p class="mt-1 text-sm font-medium text-ink/50">Student progress overview</p>
                </div>
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-manaraYellow text-manaraTeal">
                  <iconify-icon icon="lucide:bar-chart-3" class="text-2xl"></iconify-icon>
                </div>
              </div>

              <div class="mt-6 rounded-[2rem] bg-cream p-5">
                <div class="mb-5 flex items-center justify-between">
                  <p class="font-display text-sm font-bold text-ink">Program Participation</p>
                  <p class="rounded-full bg-white px-3 py-1 text-xs font-bold text-manaraTeal">2026</p>
                </div>
                <div class="flex h-44 items-end gap-4">
                  <div class="flex flex-1 flex-col items-center gap-2"><div class="h-20 w-full rounded-t-2xl bg-manaraTeal"></div><span class="text-xs font-bold text-ink/50">Lab</span></div>
                  <div class="flex flex-1 flex-col items-center gap-2"><div class="h-32 w-full rounded-t-2xl bg-manaraYellow"></div><span class="text-xs font-bold text-ink/50">Code</span></div>
                  <div class="flex flex-1 flex-col items-center gap-2"><div class="h-24 w-full rounded-t-2xl bg-manaraPurple"></div><span class="text-xs font-bold text-ink/50">Bot</span></div>
                  <div class="flex flex-1 flex-col items-center gap-2"><div class="h-36 w-full rounded-t-2xl bg-manaraPink"></div><span class="text-xs font-bold text-ink/50">Game</span></div>
                  <div class="flex flex-1 flex-col items-center gap-2"><div class="h-28 w-full rounded-t-2xl bg-manaraBlue"></div><span class="text-xs font-bold text-ink/50">Field</span></div>
                </div>
              </div>

              <div class="mt-5 grid grid-cols-2 gap-4">
                <div class="rounded-[1.5rem] border border-manaraTeal/10 bg-white p-4">
                  <div class="mb-3 flex items-center gap-2 text-manaraTeal">
                    <iconify-icon icon="lucide:dna" class="text-2xl"></iconify-icon>
                    <p class="font-display font-bold">Biology</p>
                  </div>
                  <div class="relative h-20">
                    <span class="absolute left-4 top-2 h-4 w-4 rounded-full bg-manaraTeal"></span>
                    <span class="absolute left-16 top-8 h-4 w-4 rounded-full bg-manaraYellow"></span>
                    <span class="absolute left-28 top-2 h-4 w-4 rounded-full bg-manaraPink"></span>
                    <span class="absolute left-10 top-3 h-px w-16 rotate-[22deg] bg-ink/20"></span>
                    <span class="absolute left-20 top-9 h-px w-14 -rotate-[25deg] bg-ink/20"></span>
                  </div>
                </div>
                <div class="rounded-[1.5rem] border border-manaraTeal/10 bg-white p-4">
                  <div class="mb-3 flex items-center gap-2 text-manaraPurple">
                    <iconify-icon icon="lucide:cpu" class="text-2xl"></iconify-icon>
                    <p class="font-display font-bold">Circuitry</p>
                  </div>
                  <div class="grid grid-cols-4 gap-2">
                    <span class="h-5 rounded bg-manaraPurple/20"></span><span class="h-5 rounded bg-manaraPurple/50"></span><span class="h-5 rounded bg-manaraPurple/20"></span><span class="h-5 rounded bg-manaraPurple"></span>
                    <span class="h-5 rounded bg-manaraYellow"></span><span class="h-5 rounded bg-manaraPurple/20"></span><span class="h-5 rounded bg-manaraBlue"></span><span class="h-5 rounded bg-manaraPurple/20"></span>
                    <span class="h-5 rounded bg-manaraPurple/20"></span><span class="h-5 rounded bg-manaraPink"></span><span class="h-5 rounded bg-manaraPurple/20"></span><span class="h-5 rounded bg-manaraPurple/50"></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute bottom-4 right-2 rounded-[2rem] bg-manaraYellow p-5 text-manaraTeal shadow-yellow">
              <p class="font-display text-2xl font-bold">4.8/5</p>
              <p class="text-xs font-bold uppercase tracking-wide">Mentor rating</p>
            </div>
          </div>
        </div>
      </section>

      <section id="programs" class="bg-cream py-24">
        <div class="mx-auto max-w-7xl px-5 lg:px-8">
          <div class="mb-12 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p class="font-display text-base font-bold text-manaraPink">Academic tracks</p>
              <h2 class="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Organized programs with measurable outcomes.</h2>
            </div>
            <p class="max-w-2xl text-lg font-medium leading-8 text-ink/65 lg:justify-self-end">Each track follows a structured progression: concept foundation, guided application, independent project, peer review, and final presentation.</p>
          </div>
          <div class="grid gap-6 lg:grid-cols-4">
            <article class="rounded-[2rem] border border-manaraTeal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manaraYellow text-manaraTeal"><iconify-icon icon="lucide:flask-conical" class="text-3xl"></iconify-icon></div>
              <h3 class="font-display text-2xl font-bold text-ink">Experimental Science</h3>
              <p class="mt-3 text-sm font-medium leading-6 text-ink/60">Observation, variables, measurement, safety, and lab reporting.</p>
              <ul class="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Hypothesis design</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Data recording</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Lab presentation</li>
              </ul>
              <span class="mt-6 inline-flex rounded-full bg-manaraYellow/20 px-3 py-1 text-xs font-bold text-manaraTeal">Beginner–Intermediate</span>
            </article>
            <article class="rounded-[2rem] border border-manaraTeal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manaraPurple text-white"><iconify-icon icon="lucide:code-2" class="text-3xl"></iconify-icon></div>
              <h3 class="font-display text-2xl font-bold text-ink">Creative Coding</h3>
              <p class="mt-3 text-sm font-medium leading-6 text-ink/60">Computational logic, simulation, problem decomposition, and digital prototypes.</p>
              <ul class="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPurple"></iconify-icon>Algorithmic thinking</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPurple"></iconify-icon>Interactive models</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPurple"></iconify-icon>Debugging habits</li>
              </ul>
              <span class="mt-6 inline-flex rounded-full bg-manaraPurple/10 px-3 py-1 text-xs font-bold text-manaraPurple">Project Track</span>
            </article>
            <article class="rounded-[2rem] border border-manaraTeal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manaraTeal text-white"><iconify-icon icon="lucide:bot" class="text-3xl"></iconify-icon></div>
              <h3 class="font-display text-2xl font-bold text-ink">Robotics Systems</h3>
              <p class="mt-3 text-sm font-medium leading-6 text-ink/60">Sensors, actuators, circuit basics, control logic, and iterative design.</p>
              <ul class="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Sensor calibration</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Prototype testing</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraTeal"></iconify-icon>Team engineering</li>
              </ul>
              <span class="mt-6 inline-flex rounded-full bg-manaraTeal/10 px-3 py-1 text-xs font-bold text-manaraTeal">Advanced Lab</span>
            </article>
            <article class="rounded-[2rem] border border-manaraTeal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manaraPink text-white"><iconify-icon icon="lucide:presentation" class="text-3xl"></iconify-icon></div>
              <h3 class="font-display text-2xl font-bold text-ink">Research Studio</h3>
              <p class="mt-3 text-sm font-medium leading-6 text-ink/60">Field notes, literature exploration, visual evidence, and academic communication.</p>
              <ul class="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPink"></iconify-icon>Research question</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPink"></iconify-icon>Poster design</li>
                <li class="flex gap-2"><iconify-icon icon="lucide:check" class="text-manaraPink"></iconify-icon>Public defense</li>
              </ul>
              <span class="mt-6 inline-flex rounded-full bg-manaraPink/10 px-3 py-1 text-xs font-bold text-manaraPink">Certification</span>
            </article>
          </div>
        </div>
      </section>

      <section id="method" class="bg-white py-24">
        <div class="mx-auto max-w-7xl px-5 lg:px-8">
          <div class="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p class="font-display text-base font-bold text-manaraPurple">Scientific methodology</p>
              <h2 class="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">A rigorous framework, adapted for young learners.</h2>
              <p class="mt-6 text-lg font-medium leading-8 text-ink/65">Students move through a repeatable learning cycle that builds discipline, creativity, and confidence without making science feel inaccessible.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-[2rem] bg-manaraTeal p-6 text-white shadow-academic"><p class="font-display text-4xl font-bold">01</p><h3 class="mt-5 font-display text-2xl font-bold">Question</h3><p class="mt-2 text-sm font-medium leading-6 text-white/75">Define a focused, testable scientific question.</p></div>
              <div class="rounded-[2rem] bg-manaraYellow p-6 text-manaraTeal shadow-yellow"><p class="font-display text-4xl font-bold">02</p><h3 class="mt-5 font-display text-2xl font-bold">Model</h3><p class="mt-2 text-sm font-semibold leading-6 text-manaraTeal/75">Represent ideas using sketches, data, and diagrams.</p></div>
              <div class="rounded-[2rem] bg-manaraPurple p-6 text-white shadow-academic"><p class="font-display text-4xl font-bold">03</p><h3 class="mt-5 font-display text-2xl font-bold">Test</h3><p class="mt-2 text-sm font-medium leading-6 text-white/75">Run controlled trials and compare measurable evidence.</p></div>
              <div class="rounded-[2rem] bg-manaraBlue p-6 text-ink shadow-academic"><p class="font-display text-4xl font-bold">04</p><h3 class="mt-5 font-display text-2xl font-bold">Present</h3><p class="mt-2 text-sm font-semibold leading-6 text-ink/70">Explain findings through structured academic communication.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="achievements" class="bg-cream py-24">
        <div class="mx-auto max-w-7xl px-5 lg:px-8">
          <div class="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p class="font-display text-base font-bold text-manaraTeal">Measured achievement</p>
              <h2 class="mt-3 font-display text-5xl font-bold tracking-tight text-ink lg:text-6xl">Progress you can evaluate.</h2>
            </div>
            <p class="max-w-xl text-lg font-medium leading-8 text-ink/65">We track participation, project completion, presentation readiness, and mentor feedback to improve the learning experience.</p>
          </div>
          <div class="grid gap-6 lg:grid-cols-3">
            <div class="rounded-[2rem] bg-white p-7 shadow-subtle lg:col-span-2">
              <div class="mb-6 flex items-center justify-between"><h3 class="font-display text-2xl font-bold text-ink">Skill growth by track</h3><span class="rounded-full bg-manaraTeal/10 px-3 py-1 text-xs font-bold text-manaraTeal">Quarterly report</span></div>
              <div class="space-y-5">
                <div><div class="mb-2 flex justify-between text-sm font-bold"><span>Scientific reasoning</span><span>88%</span></div><div class="h-4 rounded-full bg-manaraTeal/10"><div class="h-4 w-[88%] rounded-full bg-manaraTeal"></div></div></div>
                <div><div class="mb-2 flex justify-between text-sm font-bold"><span>Data interpretation</span><span>76%</span></div><div class="h-4 rounded-full bg-manaraYellow/20"><div class="h-4 w-[76%] rounded-full bg-manaraYellow"></div></div></div>
                <div><div class="mb-2 flex justify-between text-sm font-bold"><span>Engineering iteration</span><span>81%</span></div><div class="h-4 rounded-full bg-manaraPurple/10"><div class="h-4 w-[81%] rounded-full bg-manaraPurple"></div></div></div>
                <div><div class="mb-2 flex justify-between text-sm font-bold"><span>Presentation confidence</span><span>92%</span></div><div class="h-4 rounded-full bg-manaraPink/10"><div class="h-4 w-[92%] rounded-full bg-manaraPink"></div></div></div>
              </div>
            </div>
            <div class="rounded-[2rem] bg-manaraTeal p-7 text-white shadow-academic">
              <h3 class="font-display text-2xl font-bold">Certification badges</h3>
              <p class="mt-3 text-sm font-medium leading-6 text-white/70">Students earn badges after completing evidence-based checkpoints.</p>
              <div class="mt-7 grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-white/10 p-4 text-center"><iconify-icon icon="lucide:medal" class="text-4xl text-manaraYellow"></iconify-icon><p class="mt-2 text-xs font-bold">Lab Safety</p></div>
                <div class="rounded-2xl bg-white/10 p-4 text-center"><iconify-icon icon="lucide:badge-check" class="text-4xl text-manaraBlue"></iconify-icon><p class="mt-2 text-xs font-bold">Research</p></div>
                <div class="rounded-2xl bg-white/10 p-4 text-center"><iconify-icon icon="lucide:cpu" class="text-4xl text-manaraPink"></iconify-icon><p class="mt-2 text-xs font-bold">Robotics</p></div>
                <div class="rounded-2xl bg-white/10 p-4 text-center"><iconify-icon icon="lucide:line-chart" class="text-4xl text-white"></iconify-icon><p class="mt-2 text-xs font-bold">Data</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="events" class="bg-white py-24">
        <div class="mx-auto max-w-7xl px-5 lg:px-8">
          <div class="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p class="font-display text-base font-bold text-manaraPink">Academic calendar</p>
              <h2 class="mt-3 font-display text-5xl font-bold tracking-tight text-ink lg:text-6xl">Upcoming sessions.</h2>
            </div>
            <a id="events-calendar-link" href="#enroll" class="inline-flex w-fit items-center gap-2 rounded-full bg-manaraTeal px-6 py-3 font-display text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-manaraYellow hover:text-manaraTeal">Request calendar <iconify-icon icon="lucide:calendar-days"></iconify-icon></a>
          </div>
          <div class="overflow-hidden rounded-[2rem] border border-manaraTeal/10 bg-white shadow-subtle">
            <div class="hidden grid-cols-[1fr_1fr_1.2fr_.8fr] bg-manaraTeal px-6 py-4 text-sm font-bold uppercase tracking-wide text-white md:grid">
              <span>Date</span><span>Session</span><span>Learning focus</span><span>Status</span>
            </div>
            <div class="divide-y divide-manaraTeal/10">
              <div class="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr]"><span class="font-bold text-ink">Sat, Jan 18</span><span class="font-semibold">Experimental Lab Sprint</span><span class="text-ink/60">Variables, measurement, controlled testing</span><span class="w-fit rounded-full bg-manaraYellow/20 px-3 py-1 text-xs font-bold text-manaraTeal">Open</span></div>
              <div class="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr]"><span class="font-bold text-ink">Fri, Jan 24</span><span class="font-semibold">Robot Rescue Challenge</span><span class="text-ink/60">Sensors, logic, path optimization</span><span class="w-fit rounded-full bg-manaraPurple/10 px-3 py-1 text-xs font-bold text-manaraPurple">Few seats</span></div>
              <div class="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr]"><span class="font-bold text-ink">Thu, Jan 30</span><span class="font-semibold">Young Innovators Forum</span><span class="text-ink/60">Presentation, critique, project defense</span><span class="w-fit rounded-full bg-manaraPink/10 px-3 py-1 text-xs font-bold text-manaraPink">Register</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="mentors" class="bg-manaraTeal py-24 text-white">
        <div class="mx-auto max-w-7xl px-5 lg:px-8">
          <div class="mb-12 grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p class="font-display text-base font-bold text-manaraYellow">Mentor credentials</p>
              <h2 class="mt-3 font-display text-5xl font-bold tracking-tight lg:text-6xl">Guided by trained facilitators.</h2>
            </div>
            <p class="max-w-2xl text-lg font-medium leading-8 text-white/70 lg:justify-self-end">Mentors focus on scientific safety, structured feedback, project documentation, and learner confidence.</p>
          </div>
          <div class="grid gap-6 md:grid-cols-3">
            <article class="rounded-[2rem] bg-white p-7 text-ink shadow-academic"><div class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-manaraYellow"><iconify-icon icon="fluent-emoji:woman-scientist-medium-light" class="text-5xl"></iconify-icon></div><h3 class="font-display text-2xl font-bold">Ayesha Rahman</h3><p class="mt-1 text-sm font-bold text-manaraTeal">Robotics Mentor</p><p class="mt-4 text-sm font-medium leading-6 text-ink/60">Specializes in beginner robotics, sensor calibration, and team-based engineering challenges.</p></article>
            <article class="rounded-[2rem] bg-white p-7 text-ink shadow-academic"><div class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-manaraBlue"><iconify-icon icon="fluent-emoji:man-teacher-medium-light" class="text-5xl"></iconify-icon></div><h3 class="font-display text-2xl font-bold">Omar Faruk</h3><p class="mt-1 text-sm font-bold text-manaraPurple">Experiment Lead</p><p class="mt-4 text-sm font-medium leading-6 text-ink/60">Facilitates laboratory safety, controlled testing, and data recording for student projects.</p></article>
            <article class="rounded-[2rem] bg-white p-7 text-ink shadow-academic"><div class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-manaraPink"><iconify-icon icon="fluent-emoji:girl-medium-light" class="text-5xl"></iconify-icon></div><h3 class="font-display text-2xl font-bold">Mira Sultana</h3><p class="mt-1 text-sm font-bold text-manaraPink">Science Captain</p><p class="mt-4 text-sm font-medium leading-6 text-ink/60">Supports peer learning, academic presentation, and project showcase preparation.</p></article>
          </div>
        </div>
      </section>

      <section id="enroll" class="relative overflow-hidden bg-cream px-5 py-24 lg:px-8">
        <div class="absolute inset-0 dot-grid opacity-50"></div>
        <div class="relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] bg-white p-8 shadow-academic md:p-12 lg:p-16">
          <div class="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <p class="font-display text-base font-bold text-manaraTeal">Enrollment process</p>
              <h2 class="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Start with a structured science pathway.</h2>
              <p class="mt-5 max-w-2xl text-lg font-medium leading-8 text-ink/65">Submit interest, attend an orientation session, choose a track, and begin a mentor-guided project cycle.</p>
              <div class="mt-8 flex flex-col gap-4 sm:flex-row">
                <a id="cta-apply-link" href="mailto:hello@manaratscience.club" class="inline-flex items-center justify-center gap-3 rounded-full bg-manaraTeal px-8 py-4 font-display text-base font-bold text-white shadow-academic transition hover:-translate-y-1 hover:bg-manaraYellow hover:text-manaraTeal">Apply Now <iconify-icon icon="lucide:send" class="text-xl"></iconify-icon></a>
                <a id="cta-download-link" href="#programs" class="inline-flex items-center justify-center gap-3 rounded-full border border-manaraTeal/20 bg-white px-8 py-4 font-display text-base font-bold text-manaraTeal transition hover:-translate-y-1 hover:border-manaraYellow">Review Tracks <iconify-icon icon="lucide:file-text" class="text-xl"></iconify-icon></a>
              </div>
            </div>
            <div class="rounded-[2rem] bg-manaraTeal p-6 text-white">
              <h3 class="font-display text-2xl font-bold">How enrollment works</h3>
              <div class="mt-6 space-y-4">
                <div class="flex gap-4 rounded-2xl bg-white/10 p-4"><span class="font-display text-2xl font-bold text-manaraYellow">1</span><div><p class="font-bold">Interest form</p><p class="text-sm text-white/65">Tell us your goals and preferred track.</p></div></div>
                <div class="flex gap-4 rounded-2xl bg-white/10 p-4"><span class="font-display text-2xl font-bold text-manaraYellow">2</span><div><p class="font-bold">Orientation</p><p class="text-sm text-white/65">Meet mentors and review expectations.</p></div></div>
                <div class="flex gap-4 rounded-2xl bg-white/10 p-4"><span class="font-display text-2xl font-bold text-manaraYellow">3</span><div><p class="font-bold">Project cycle</p><p class="text-sm text-white/65">Begin experiments, documentation, and review.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
```

Please reference this design and implement it into our codebase; Try to understand the structure, which part of our codebase is relevant and implement
