# Extractable Components

## Layout Components

### Nav
- Source: `src/components/nav.tsx`
- Category: layout
- Description: Main top navigation with logo, links, theme toggle, user menu, and Join CTA
- Extractable props: activeItem (string, default: "home"), theme (string, default: "light"), isLoggedIn (boolean, default: false), showMobileMenu (boolean, default: false)
- Hardcoded: Logo SVG/Atom icon, nav link labels ("Home", "Legacy", "Achievements", etc.), brand name "Manarat Science Club", all CSS/classes, theme toggle icon, "Report a bug" link, "Join MSC" button

### Footer
- Source: `src/components/footer.tsx`
- Category: layout
- Description: Site footer with contact info, navigation links, and social media links
- Extractable props: none (all content is static/site config)
- Hardcoded: All text, links, icons, gradient backgrounds

## Basic Components

No basic components need extraction — all UI primitives (Button, Input, Card patterns) are simple enough to be inline in drafts.
