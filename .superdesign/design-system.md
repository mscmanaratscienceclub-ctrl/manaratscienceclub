# Manarat Science Club — Design System

## Product Context
A high school science club website for Manarat Dhaka International School & College. Features include member management, blog/CMS, events calendar, achievements showcase, and team/opportunity listings. The brand emphasizes scientific curiosity, academic excellence, and youth innovation.

## Brand Colors (Light Theme — MUST KEEP UNCHANGED)

### Neutrals
- `--cream`: #fff8ec (warm off-white background)
- `--ink`: #142326 (dark text)
- `--surface`: #ffffff (card/surface background)

### Brand palette
- `--manara-teal`: #005f6b (primary brand color — used for CTAs, links, accents)
- `--manara-yellow`: #ffb703 (secondary accent — used for highlights, badges)
- `--manara-purple`: #7c3aed (used for Creative Coding track)
- `--manara-pink`: #ec4899 (used for social hover states)
- `--manara-blue`: #60a5fa
- `--manara-red`: #dc2626 (used for Research Studio, destructive, CTA variants)

### Shadows
- `--sh-academic`: 0 18px 50px rgba(0, 95, 107, 0.12)
- `--sh-subtle`: 0 10px 30px rgba(20, 35, 38, 0.08)
- `--sh-yellow`: 0 16px 36px rgba(255, 183, 3, 0.25)
- `--sh-red`: 0 16px 36px rgba(220, 38, 38, 0.2)

## Brand Colors (Dark Theme — CURRENT, TO BE REDESIGNED)

### Neutrals (current)
- `--cream`: #0b1120 (dark navy background)
- `--ink`: #e2e8f0 (light slate text)
- `--surface`: #131c2e (dark card surface)

### Brand palette (current)
- `--manara-teal`: #2dd4bf (brighter teal for dark mode)
- `--manara-yellow`: #fbbf24
- `--manara-purple`: #a78bfa
- `--manara-pink`: #f472b6
- `--manara-blue`: #60a5fa
- `--manara-red`: #f87171

### Shadows (current dark)
- `--sh-academic`: 0 18px 50px rgba(0, 0, 0, 0.45)
- `--sh-subtle`: 0 10px 30px rgba(0, 0, 0, 0.3)
- `--sh-yellow`: 0 16px 36px rgba(251, 191, 36, 0.12)
- `--sh-red`: 0 16px 36px rgba(248, 113, 113, 0.12)

## Typography
- `font-sans`: Noto Sans (body/UI text)
- `font-display`: Fredoka (headings, CTAs) — rounded, friendly geometric sans
- `font-heading`: Playfair Display (editorial headings)
- `font-body`: Rubik (paragraphs/long-form)
- `font-mono`: Geist Mono (code)

## Border Radius
- `--radius`: 0.625rem (base)
- `radius-sm`: calc(var(--radius) - 4px) ~ 0.375rem
- `radius-md`: calc(var(--radius) - 2px) ~ 0.5rem
- `radius-lg`: var(--radius) ~ 0.625rem
- `radius-xl`: calc(var(--radius) + 4px) ~ 0.75rem
- `radius-2xl`: calc(var(--radius) * 1.8) ~ 1.125rem
- `radius-3xl`: calc(var(--radius) * 2.2) ~ 1.375rem
- `radius-4xl`: calc(var(--radius) * 2.6) ~ 1.625rem
- Common: `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-[3rem]`

## Layout
- Max-width container: `max-w-7xl` (80rem)
- Horizontal padding: `px-5 lg:px-8`
- Section spacing: `py-16 sm:py-20` or `py-24`
- Grid patterns: `grid gap-6 sm:grid-cols-2 lg:grid-cols-4`

## Component Patterns

### Cards
- Border: `border border-manara-teal/10`
- Background: `bg-surface`
- Shadow: `shadow-subtle`
- Hover: `hover:-translate-y-1 hover:shadow-academic`
- Border radius: `rounded-2xl` or `rounded-[2rem]`

### Primary CTAs (teal)
- `rounded-full bg-manara-teal px-8 py-4 font-display text-base font-bold text-white shadow-academic`
- Hover: `hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal`

### Secondary CTAs (outline)
- `rounded-full border border-manara-teal/20 bg-surface px-8 py-4 font-display text-base font-bold text-manara-teal shadow-subtle`
- Hover: `hover:-translate-y-1 hover:border-manara-yellow`

### Status badges
- Open: `rounded-full bg-manara-yellow/20 px-3 py-1 text-xs font-bold text-manara-teal`
- Few seats: `rounded-full bg-manara-red/10 px-3 py-1 text-xs font-bold text-manara-red`
- Register: `rounded-full bg-manara-yellow/10 px-3 py-1 text-xs font-bold text-manara-yellow`
- Year: `rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-ink/60`

### Grid backgrounds (decorative)
- `.diagram-grid`: Teal dot-grid pattern
- `.dot-grid`: Radial dot pattern
- CTA section full-bleed gradient

## Animation
- Hover: `transition hover:-translate-y-1` (cards, buttons)
- Theme switch: `color 0.2s ease, background-color 0.2s ease` on `<html>`
- `.fade-up`: opacity + translateY over 0.7s (used on hero)

## Key Design Principles
1. Teal is primary brand color (CTAs, links, icons, borders)
2. Yellow is secondary accent (highlights, badges, hover states)
3. Red used for emphasis/destructive/research
4. Cards have subtle borders, soft shadows, and lift-on-hover
5. Buttons are rounded-full with bold Fredoka font
6. Navigation is sticky with teal/10 bottom border
7. Footer is always dark gradient regardless of theme
8. Background is cream (light) / dark navy (dark)
