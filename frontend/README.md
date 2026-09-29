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
| Linter | Biome 2.4.2 |
| Package Manager | Bun 1.4.2 |

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                  # Auth routes (login, signup, OTP, password reset)
│   ├── app/                     # Authenticated app shell (feed, notifications, etc.)
│   ├── u/                       # Public profiles (directory + user profiles)
│   ├── auth/                    # Additional auth pages
│   ├── c/                       # Additional pages
│   ├── privacy/ terms/          # Static pages
│   ├── layout.js                # Root layout with fonts
│   ├── page.js                  # Landing/marketing page
│   └── globals.css              # Design tokens + animations
├── components/
│   ├── app/                     # Feature components (22 files)
│   ├── auth/                    # Auth components (4 files)
│   ├── landing/                 # Landing page components (9 files)
│   ├── ui/                      # shadcn/ui primitives (6 files)
│   └── BrandLogo.jsx            # Logo component
├── lib/
│   ├── api.js                   # Central API client (all endpoints)
│   ├── queryClient.js           # TanStack Query config
│   ├── accents.js               # Theme colors
│   ├── college.js               # College utilities
│   ├── hiddenPosts.js           # LocalStorage hidden posts
│   └── utils.js                 # cn() helper
└── providers/
    └── query-provider.jsx       # TanStack Query provider
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

- Dark theme: `#000000` background
- Accent: warm peach `#ffcead`
- Font: JetBrains Mono, 15px base
- See [../DESIGN.md](../DESIGN.md) for full design tokens

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (required) |
