# Routes

## File-based routing (Next.js App Router)

### Site routes (public, with Nav + Footer)
| URL | File | Layout |
|-----|------|--------|
| `/` | `src/app/(routes)/(site)/page.tsx` | SiteLayout |
| `/legacy` | `src/app/(routes)/(site)/legacy/page.tsx` | SiteLayout |
| `/achievements` | `src/app/(routes)/(site)/achievements/page.tsx` | SiteLayout |
| `/blogs` | `src/app/(routes)/(site)/blogs/page.tsx` | SiteLayout |
| `/blogs/[slug]` | `src/app/(routes)/(site)/blogs/[slug]/page.tsx` | SiteLayout |
| `/events` | `src/app/(routes)/(site)/events/page.tsx` | SiteLayout |
| `/opportunities` | `src/app/(routes)/(site)/opportunities/page.tsx` | SiteLayout |
| `/join` | `src/app/(routes)/(site)/join/page.tsx` | SiteLayout |
| `/profile` | `src/app/(routes)/(site)/profile/page.tsx` | SiteLayout |

### Auth routes (public, with Nav + Footer)
| URL | File | Layout |
|-----|------|--------|
| `/signin` | `src/app/(routes)/(auth)/signin/page.tsx` | AuthLayout |
| `/signup` | `src/app/(routes)/(auth)/signup/page.tsx` | AuthLayout |

### CMS routes (admin-only, requires auth + admin/writer role)
| URL | File | Layout |
|-----|------|--------|
| `/cms` | `src/app/(routes)/(cms)/cms/page.tsx` | CmsLayout |

## Key pages summary

### Home Page (`/`)
- Hero: science club branding with stats (450+ members, 30+ teams, 61 accolades)
- Programs section: 4 academic track cards (Experimental Science, Creative Coding, Robotics Systems, Research Studio)
- Faculty editorial section: 2 advisor cards with quotes
- Recent Research section: blog post cards grid
- CTA section: enrollment process with 3-step explanation

### Achievements (`/achievements`)
- Hero with trophy icon
- Achievement cards grid with icons, tier badges, year

### Legacy (`/legacy`)
- Hero section
- Member grids: Legacy, Current, 2026-2027 Edition members
- Member cards with photo, name, role, batch, social links

### Events (`/events`)
- Hero section
- Events table with date, session, focus, status badges

### Opportunities (`/opportunities`)
- Hero section
- Active Engineering Teams grid (4 teams)
- Open Positions CTA section

### Join (`/join`)
- Auth-gated: redirects to sign-in if not logged in
- Member application form with personal info, interests, SOP
