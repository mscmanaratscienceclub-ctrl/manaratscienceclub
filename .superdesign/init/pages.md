# Page Component Dependency Trees

## / (Home Page)
Entry: `src/app/(routes)/(site)/page.tsx`
Dependencies:
- `src/app/globals.css`
- `src/app/layout.tsx`
  - `src/providers/index.tsx`
    - `src/components/ui/sonner.tsx`
  - `src/lib/utils.ts`
- `src/app/(routes)/(site)/layout.tsx`
  - `src/components/nav.tsx`
    - `src/lib/auth/client.ts`
    - `src/lib/data/index.ts`
    - `src/lib/utils.ts`
  - `src/components/footer.tsx`
    - `src/lib/data/index.ts`
  - `src/app/globals.css`
- `src/lib/actions/posts.ts`

## /achievements
Entry: `src/app/(routes)/(site)/achievements/page.tsx`
Dependencies:
- SiteLayout (same as above)
- `src/app/globals.css`

## /legacy
Entry: `src/app/(routes)/(site)/legacy/page.tsx`
Dependencies:
- SiteLayout (same as above)
- `src/lib/data/index.ts`
- `src/app/globals.css`

## /events
Entry: `src/app/(routes)/(site)/events/page.tsx`
Dependencies:
- SiteLayout (same as above)
- `src/app/globals.css`

## /opportunities
Entry: `src/app/(routes)/(site)/opportunities/page.tsx`
Dependencies:
- SiteLayout (same as above)
- `src/app/globals.css`

## /join
Entry: `src/app/(routes)/(site)/join/page.tsx`
Dependencies:
- SiteLayout (same as above)
- `src/lib/auth/client.ts`
- `src/app/globals.css`

## /signin, /signup
Entry: `src/app/(routes)/(auth)/signin/page.tsx`, `src/app/(routes)/(auth)/signup/page.tsx`
Dependencies:
- AuthLayout (`src/app/(routes)/(auth)/layout.tsx`)
  - `src/components/nav.tsx`
  - `src/components/footer.tsx`
- `src/app/globals.css`

## /cms
Entry: `src/app/(routes)/(cms)/cms/page.tsx`
Dependencies:
- CmsLayout (`src/app/(routes)/(cms)/layout.tsx`)
  - `src/components/cms/sidebar.tsx`
  - `src/lib/auth/get-session.ts`
- `src/components/cms/editor.tsx`
- `src/components/cms/post-form.tsx`
- `src/components/cms/toolbar.tsx`
- `src/app/globals.css`
