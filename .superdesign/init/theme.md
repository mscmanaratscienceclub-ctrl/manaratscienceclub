# Theme / Design System

## Framework: Next.js 16 with Tailwind CSS v4

- Meta-framework: Next.js
- CSS approach: Tailwind CSS v4 with CSS variables
- Component library: shadcn/ui (Radix-based)
- Theme provider: next-themes
- Theme switching: `class` strategy (`.dark` class on `<html>`)

## Fonts

- `--font-sans`: Noto Sans (Google Fonts)
- `--font-heading`: Playfair Display (Google Fonts)
- `--font-fredoka`: Fredoka (Google Fonts) — used as `font-display`
- `--font-rubik`: Rubik (Google Fonts) — used as `font-body`
- `--font-geist-sans`: Geist Sans (local)
- `--font-geist-mono`: Geist Mono (local)

## Full globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* Brand raw tokens (light) */
  --cream: #fff8ec;
  --ink: #142326;
  --surface: #ffffff;
  --manara-teal: #005f6b;
  --manara-yellow: #ffb703;
  --manara-purple: #7c3aed;
  --manara-pink: #ec4899;
  --manara-blue: #60a5fa;
  --manara-red: #dc2626;

  --sh-academic: 0 18px 50px rgba(0, 95, 107, 0.12);
  --sh-subtle: 0 10px 30px rgba(20, 35, 38, 0.08);
  --sh-yellow: 0 16px 36px rgba(255, 183, 3, 0.25);
  --sh-red: 0 16px 36px rgba(220, 38, 38, 0.2);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);

  /* Brand raw tokens (dark) */
  --cream: #0b1120;
  --ink: #e2e8f0;
  --surface: #131c2e;
  --manara-teal: #2dd4bf;
  --manara-yellow: #fbbf24;
  --manara-purple: #a78bfa;
  --manara-pink: #f472b6;
  --manara-blue: #60a5fa;
  --manara-red: #f87171;

  --sh-academic: 0 18px 50px rgba(0, 0, 0, 0.45);
  --sh-subtle: 0 10px 30px rgba(0, 0, 0, 0.3);
  --sh-yellow: 0 16px 36px rgba(251, 191, 36, 0.12);
  --sh-red: 0 16px 36px rgba(248, 113, 113, 0.12);
}
```

### Theme inline mappings (applied via `@theme inline`)

```
--color-background: var(--background)
--color-foreground: var(--foreground)
--color-card: var(--card)
--color-card-foreground: var(--card-foreground)
--color-popover: var(--popover)
--color-primary: var(--primary)
--color-primary-foreground: var(--primary-foreground)
--color-secondary: var(--secondary)
--color-secondary-foreground: var(--secondary-foreground)
--color-muted: var(--muted)
--color-muted-foreground: var(--muted-foreground)
--color-accent: var(--accent)
--color-accent-foreground: var(--accent-foreground)
--color-destructive: var(--destructive)
--color-destructive-foreground: var(--destructive-foreground)
--color-border: var(--border)
--color-input: var(--input)
--color-ring: var(--ring)
--color-chart-1: var(--chart-1)
--color-chart-2: var(--chart-2)
--color-chart-3: var(--chart-3)
--color-chart-4: var(--chart-4)
--color-chart-5: var(--chart-5)
--radius-sm: calc(var(--radius) - 4px)  // ~0.375rem
--radius-md: calc(var(--radius) - 2px)  // ~0.5rem
--radius-lg: var(--radius)              // 0.625rem
--radius-xl: calc(var(--radius) + 4px)  // ~0.75rem
--color-sidebar: var(--sidebar)
--color-sidebar-foreground: var(--sidebar-foreground)
--color-sidebar-primary: var(--sidebar-primary)
--color-sidebar-primary-foreground: var(--sidebar-primary-foreground)
--color-sidebar-accent: var(--sidebar-accent)
--color-sidebar-accent-foreground: var(--sidebar-accent-foreground)
--color-sidebar-border: var(--sidebar-border)
--color-sidebar-ring: var(--sidebar-ring)
--color-manara-teal: var(--manara-teal)
--color-manara-yellow: var(--manara-yellow)
--color-manara-purple: var(--manara-purple)
--color-manara-pink: var(--manara-pink)
--color-manara-blue: var(--manara-blue)
--color-manara-red: var(--manara-red)
--color-cream: var(--cream)
--color-ink: var(--ink)
--color-surface: var(--surface)
--shadow-academic: var(--sh-academic)
--shadow-subtle: var(--sh-subtle)
--shadow-yellow: var(--sh-yellow)
--shadow-red: var(--sh-red)
--animate-accordion-down: accordion-down 0.2s ease-out
--animate-accordion-up: accordion-up 0.2s ease-out
--font-sans: var(--font-sans)
--font-heading: var(--font-heading)
--font-display: var(--font-fredoka)
--font-body: var(--font-rubik)
--radius-2xl: calc(var(--radius) * 1.8)  // ~1.125rem
--radius-3xl: calc(var(--radius) * 2.2)  // ~1.375rem
--radius-4xl: calc(var(--radius) * 2.6)  // ~1.625rem
```

### Base layer
- All elements: `border-border outline-ring/50`
- Body: `background-color: var(--color-cream); color: var(--color-ink)`
- HTML: `font-sans`
- Selection: `background-color: color-mix(in srgb, var(--color-manara-teal) 25%, transparent)`
- Theme transition: `color 0.2s ease, background-color 0.2s ease`

### Utility classes
- `.diagram-grid`: Teal dot-grid background with 32px cells
- `.dot-grid`: Radial gradient dot pattern with 20px spacing
- `.fade-up`: Fade-in + translateY animation (0.7s)
- `.fade-up-delay`: Same with 0.12s delay

### Footer backgrounds
- `.bg-footer`: Linear gradient (light: `#002f36 → #005f6b → #007a8a`, dark: `#04101a → #0b1a2e → #112340`)
- `.bg-footer-accent`: Multi-color gradient bar (light: `#ffb703, #ec4899, #7c3aed, #005f6b`, dark: `#fbbf24, #f472b6, #a78bfa, #22d3ee`)
