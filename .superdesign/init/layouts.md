# Layout Components

## Root Layout (`src/app/layout.tsx`)

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", notoSans.variable, playfairDisplayHeading.variable, fredoka.variable, rubik.variable)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Font variables loaded: Noto Sans (sans), Playfair Display (heading), Fredoka (display), Rubik (body), Geist Sans/Mono (local).

## Providers (`src/providers/index.tsx`)

```tsx
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NextTopLoader easing="ease" showSpinner={false} color="var(--primary)" />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
      <Toaster position="top-center" />
    </>
  );
}
```

## Site Layout (`src/app/(routes)/(site)/layout.tsx`)

```tsx
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
```

## Auth Layout (`src/app/(routes)/(auth)/layout.tsx`)

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream font-body text-ink">
      <Nav />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
```

## CMS Layout (`src/app/(routes)/(cms)/layout.tsx`)

Admin-only layout with sidebar. Server-side auth check.

## Nav Component (`src/components/nav.tsx`)

- Sticky top navigation
- Logo: Atom icon in teal box with "Manarat Science Club" text
- Navigation links: Home, Legacy, Achievements, Research, Events, Opportunities
- Dark/light theme toggle button (sun/moon)
- User profile link or sign-up
- "Report a bug" link
- "Join MSC" CTA button (teal filled)
- Mobile responsive: hamburger menu with slide-down panel
- Uses next-themes for theme switching

## Footer Component (`src/components/footer.tsx`)

- Dark gradient background (teal/dark blue)
- Multi-color accent line at top
- Brand column with Microscope icon
- 3-column grid: Contact, Explore (nav links), Community (social links)
- Bottom bar with copyright and designer credit
