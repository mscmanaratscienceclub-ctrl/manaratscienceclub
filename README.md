# Manarat Science Club

A full-featured web application for **Manarat Science Club (MSC)** — the official science club of Manarat Dhaka International School & College, Bangladesh. Built with Next.js 16, Better Auth, Drizzle ORM, and Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (Turbopack) + TypeScript 6 |
| **Styling** | Tailwind CSS v4 + shadcn/ui (radix-sera) + lucide-react |
| **Auth** | Better Auth v1.6.9 (email/password, username, Google OAuth, magic link, email OTP) |
| **Database** | PostgreSQL via Supabase, Drizzle ORM v0.45 + Drizzle Kit v0.31 |
| **Forms** | react-hook-form + Zod v4 + @hookform/resolvers |
| **Rich Text** | TipTap (StarterKit, Link, Placeholder, Underline) |
| **Notifications** | sonner |
| **Animation** | nextjs-toploader, tw-animate-css |

## Project Structure

```
src/
├── app/
│   ├── (routes)/
│   │   ├── (auth)/            # Authentication pages (sign-in, sign-up)
│   │   ├── (cms)/             # Admin CMS (admin/writer role-gated)
│   │   │   └── cms/
│   │   │       ├── page.tsx          # Dashboard
│   │   │       ├── posts/            # Post CRUD (list, new, edit)
│   │   │       └── users/            # User management (admin only)
│   │   └── (site)/            # Public-facing pages
│   │       ├── page.tsx               # Homepage
│   │       ├── achievements/
│   │       ├── blogs/                 # Blog index + dynamic [slug]
│   │       ├── events/
│   │       ├── join/                  # Membership form
│   │       ├── legacy/
│   │       ├── opportunities/
│   │       └── profile/               # User profile
│   ├── api/auth/[...all]/     # Better Auth API handler
│   ├── globals.css            # Tailwind v4 + shadcn + custom theme
│   └── layout.tsx             # Root layout (fonts, metadata, providers)
├── components/
│   ├── cms/                   # CMS components (editor, sidebar, post-form, toolbar)
│   ├── ui/                    # shadcn/ui primitives
│   ├── nav.tsx                # Sticky top navigation
│   └── footer.tsx             # 3-column site footer
├── db/
│   ├── index.ts               # Drizzle ORM client
│   └── schema/
│       ├── auth/              # User, Account, Session, Verification tables
│       └── posts.ts           # Posts table
├── lib/
│   ├── actions/               # Server actions (posts CRUD, user management)
│   ├── auth/                  # Auth config (client, server, session, passwords)
│   └── data/                  # Static site data (config, metrics, leadership, events, etc.)
├── providers/                 # Client providers (TopLoader, Toaster)
├── proxy.ts                   # Route protection middleware
└── routes.ts                  # Route definitions
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `user` | Users with roles (admin, writer, member), profile info, gender, ban status |
| `account` | OAuth/linked accounts and passwords |
| `session` | User sessions with IP and user-agent tracking |
| `verification` | Email OTP and magic link verification |
| `posts` | Blog posts with slug, content (HTML), status (draft/published), cover image |

All tables have Row-Level Security enabled.

## Pages & Routes

### Public Site (`(site)`)
| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, programs grid, faculty editorial, recent posts, CTA |
| `/blogs` | Blog index — all published posts |
| `/blogs/[slug]` | Individual blog post |
| `/events` | Events listing (static data) |
| `/achievements` | Club achievements (static data) |
| `/legacy` | Club history and legacy (static data) |
| `/opportunities` | Opportunities for members (static data) |
| `/join` | Membership application form |
| `/profile` | User profile editing (requires auth) |

### Auth (`(auth)`)
| Route | Description |
|-------|-------------|
| `/signin` | Sign-in with username/email + password, Google OAuth, magic link, email OTP |
| `/signup` | Registration with name, email, username, password, gender |

### CMS (`(cms)`)
| Route | Access | Description |
|-------|--------|-------------|
| `/cms` | admin, writer | Dashboard |
| `/cms/posts` | admin, writer | Post management (list, create, edit, publish/unpublish, delete) |
| `/cms/users` | admin only | User management (list, change roles) |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase project)
- Better Auth secret key

### Setup

```bash
git clone https://github.com/JabirDev/nextjs-better-auth.git
cd nextjs-better-auth
bun install
```

Copy environment variables:

```bash
cp env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase connection string (session pooler) |
| `DIRECT_URL` | Yes | Supabase direct connection (for migrations) |
| `BETTER_AUTH_SECRET` | Yes | Better Auth secret key |
| `NEXT_PUBLIC_BASE_URL` | Yes | Application base URL |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

Run database migrations:

```bash
bun db:migrate
```

Start development:

```bash
bun dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start dev server with Turbopack |
| `bun build` | Production build with Turbopack |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun db:generate` | Generate Drizzle migrations |
| `bun db:migrate` | Push schema to database |
| `bun db:studio` | Open Drizzle Studio GUI |

## Auth System

- **Email/password** — default authentication method with username support
- **Google OAuth** — social login (configure via env vars)
- **Magic Link** — passwordless email sign-in (partial implementation)
- **Email OTP** — one-time password via email (partial implementation)

User roles: `admin`, `writer`, `member` (default).

## CMS Features

- **Role-gated access:** Admin and writer roles can access the CMS
- **Post management:** Create, edit, publish/unpublish, and delete blog posts
- **Rich text editor:** TipTap-based WYSIWYG editor with formatting toolbar
- **User management:** Admins can list users and change roles

## License

MIT — Copyright 2025 Jabir Developer
