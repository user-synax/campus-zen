# CampusZen Frontend

Student-first social network frontend built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16.3.6 (App Router) |
| UI Library | React 19.2.8 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animations | Framer Motion, Motion |
| Query | TanStack Query (@tanstack/react-query) |
| Icons | lucide-react |
| Dates | date-fns |
| Primitives | @base-ui/react, @radix-ui/react-slot, @radix-ui/react-tooltip, sonner, tw-animate-css |
| Linter | Biome 2.4.2 |
| Package Manager | Bun 1.4.2 |

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                  # Auth routes (login, signup, verify-email, forgot/reset-password)
│   ├── app/                     # Authenticated shell (feed, create, search, notifications, bookmarks, menu, profile, p/[id])
│   ├── app/tag/[tag]/           # Hashtag feed (note: under app/, not top-level)
│   ├── c/                       # Colleges directory + [slug]
│   ├── u/                       # Public profiles (directory + [username])
│   ├── admin/                   # Admin dashboard (robots noindex, env-gated)
│   ├── privacy/ terms/          # Static pages
│   ├── layout.js                # Root layout (Inter font, cz-theme cookie, QueryProvider, PushRegistrar)
│   ├── page.js                  # Landing/marketing page
│   ├── manifest.js              # PWA manifest
│   └── globals.css              # Design tokens + animations (~1193 lines)
├── components/
│   ├── app/                     # Feature components (PostCard, PostComposer, PostMedia, VideoPlayer, PollBlock,
│   │                            #   MentionAutocomplete, ProfileHeader, PrivateProfile, FollowRequests,
│   │                            #   PrivacySettings, AccountData, PushRegistrar/Settings/Banner, etc.)
│   ├── auth/                    # AuthShell, GuestGuard, OtpInput, PasswordStrength
│   ├── landing/                 # LandingNav, Hero, HeroVisual, LandingCloudscape, HowItWorks,
│   │                            #   Features, TrustSafety, Scope, FinalCTA, LandingFooter, Reveal, LandingRedirect
│   ├── forgeui/                 # cloudscape.jsx (WebGL background)
│   ├── ui/                      # shadcn/ui primitives (button, input, label, checkbox, sonner, verified-badge, contribution-graph)
│   ├── BrandLogo.jsx            # Logo component
│   └── providers/               # query-provider.jsx (TanStack Query provider)
├── lib/
│   ├── api.js                   # Central API client (all endpoints, auto-refresh)
│   ├── queryClient.js           # TanStack Query config
│   ├── hooks/                   # queries.js, useRequireSession.js, useSSE.js, usePush.js
│   ├── theme.js                 # cz-theme cookie read/write
│   ├── push.js                  # Web Push helpers (ensureSubscribed/Unsubscribed)
│   ├── media.js                 # Post media validation (image/gif/video limits, posters)
│   ├── optimistic.js            # patchPostEverywhere / patchUserEverywhere
│   ├── railCache.js             # Right-rail trends/suggestions cache
│   ├── avatar.js                # Avatar ring helpers (owner/cofounder)
│   ├── college.js               # College slug/href helpers
│   ├── hiddenPosts.js           # LocalStorage hidden/reported posts
│   └── utils.js                 # cn() helper
```

## Getting Started

1. Ensure backend is running on `http://localhost:4000`
2. Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env`
3. Run `bun run dev` to start on `http://localhost:3000`

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Development server with hot reload |
| `build` | `next build` | Production build |
| `start` | `next start` | Production server |
| `lint` | `biome check` | Lint code |
| `format` | `biome format --write` | Format code |

## Design System

- Light: `#ffffff` background / Dark: `#000000` (+ `#16181c` surfaces)
- Accent: single chromatic `#1d9bf0` (interactive only — buttons, links, verified badges)
- Semantic: like `#f91880`, repost/success `#00ba7c`, error `#f4212e`
- Font: Inter (TwitterChirp substitute, `ss01` + `cv11`), 15px/20px body, JetBrains Mono for OTPs/ids only
- Radii: `16px` cards/modals, `9999px` buttons/tags/avatars (`4px` inputs per DESIGN.md)
- See [../DESIGN.md](../DESIGN.md) for full design tokens

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (required) |
