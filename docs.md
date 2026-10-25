# CampusZen — Developer Documentation

> **CampusZen** is a student-focused social media web application (X/Twitter-style), designed specifically for college students in India. This document serves as the complete developer guide for anyone contributing to or learning from the codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Getting Started](#5-getting-started)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [Backend Deep Dive](#7-backend-deep-dive)
8. [API Reference](#8-api-reference)
9. [Authentication & Security](#9-authentication--security)
10. [Database Schema](#10-database-schema)
11. [Design System](#11-design-system)
12. [Conventions & Patterns](#12-conventions--patterns)
13. [Deployment](#13-deployment)
14. [Testing](#14-testing)
15. [Useful Files Map](#15-useful-files-map)

---

## 1. Project Overview

| Detail | Value |
|--------|-------|
| **Name** | CampusZen |
| **Type** | Full-stack social media web application |
| **Target Users** | College students in India |
| **Status** | MVP (September 2026) |
| **Allowed Email Domains** | `gmail.com`, `proton.me` |
| **Brand Aesthetic** | X-style monochrome, single accent `#1d9bf0`, Inter (TwitterChirp substitute), light + dark via `cz-theme` cookie — see `DESIGN.md` and `frontend/app/globals.css` |

### Product Flow

```
Sign Up → Verify Email (OTP) → Login → Discover Students → Follow → Post → Interact → Return
```

### Related Documents

- **[PRD.md](./PRD.md)** — Full Product Requirements Document
- **[DESIGN.md](./DESIGN.md)** — Design system tokens & visual guidelines

---

## 2. Tech Stack

### Frontend

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 16.3.6 |
| UI Library | React | 19.2.8 |
| Language | JavaScript (JSX) | — |
| Styling | Tailwind CSS v4 | ^4 |
| UI Components | shadcn/ui | ^4.21.0 |
| Animations | Framer Motion + Motion | ^13.4.3 / ^13.4.4 |
| Icons | lucide-react | 0.511.0 |
| Date utilities | date-fns | ^4.4.0 |
| Query | @tanstack/react-query | ^5.104.0 |
| Class utilities | clsx, tailwind-merge, cn, class-variance-authority | various |
| Base UI | @base-ui/react | ^1.8.0 |
| Primitives | @radix-ui/react-slot, @radix-ui/react-tooltip, sonner (CzToaster), tw-animate-css | various |
| Linter/Formatter | Biome | 2.4.2 |
| Package Manager | Bun | 1.4.2 |

### Backend

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js (ESM modules) | — |
| Framework | Express.js | ^4.21.2 |
| Language | JavaScript (ESM) | — |
| Database | MongoDB via Mongoose | ^8.9.5 |
| Validation | Zod | ^3.24.1 |
| Auth | JWT (jsonwebtoken) + bcryptjs | ^9.0.2 / ^2.4.3 |
| File uploads | Multer | ^2.4.0 |
| Email | Resend (HTTPS) + Nodemailer (SMTP fallback) | ^10.0.10 |
| File storage | Appwrite (server-side SDK) | `appwrite ^28.0.0` + `node-appwrite ^29.0.0` (both installed; server-side only) |
| Push | Web Push via `web-push` | `^3.6.7` (VAPID, `/api/push/*`) |
| Security | helmet, cors, hpp, express-mongo-sanitize, express-rate-limit | various |
| Compression | compression | ^1.8.0 |
| Package Manager | Bun | 1.4.2 |

---

## 3. Repository Structure

```
D:\campus-zen\
├── PRD.md                          # Product Requirements Document
├── DESIGN.md                       # Design system tokens & guidelines
├── docs.md                         # This file — developer documentation
│
├── frontend/                       # Next.js frontend application
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.js               # Root layout (Inter font, metadata, cz-theme)
│   │   ├── page.js                 # Landing page (Hero, HowItWorks, Features, TrustSafety, Scope, FinalCTA)
│   │   ├── globals.css             # Tailwind v4 + X-style tokens (light :root / .dark, Inter, #1d9bf0)
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── layout.jsx
│   │   │   ├── login/page.jsx
│   │   │   ├── signup/page.jsx
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── verify-email/
│   │   ├── app/                    # Authenticated app shell
│   │   │   ├── layout.jsx          # Auth guard + 3-column layout
│   │   │   ├── page.jsx            # Home feed (Following/Discovery)
│   │   │   ├── create/page.jsx     # Create post (text + media[] + poll)
│   │   │   ├── notifications/      # Notifications page (SSE live)
│   │   │   ├── search/             # Search (users + posts + colleges)
│   │   │   ├── bookmarks/          # Saved posts
│   │   │   ├── tag/[tag]/         # Hashtag feed (under app/, route /app/tag/[tag])
│   │   │   ├── menu/               # Menu/settings/logout + FollowRequests + PrivacySettings
│   │   │   ├── profile/            # Own profile + [username]
│   │   │   └── p/[id]/             # Single post view
│   │   ├── c/                      # Colleges directory + [slug]
│   │   ├── admin/                  # Admin dashboard (robots noindex, env-gated)
│   │   ├── u/                      # Public profiles
│   │   │   ├── page.jsx            # Students directory
│   │   │   └── [username]/page.jsx
│   │   ├── privacy/page.jsx
│   │   └── terms/page.jsx
│   │
│   ├── components/
│   │   ├── app/                    # Feature components (~40 files)
│   │   │   ├── PostCard.jsx        # Post with like/reply/repost/bookmark/poll
│   │   │   ├── PostComposer.jsx    # Text + media[] + poll composer + MentionAutocomplete
│   │   │   ├── PostMedia.jsx + VideoPlayer.jsx + CzImage.jsx + ImageLightbox.jsx
│   │   │   ├── PollBlock.jsx + ReplyComposer.jsx + RichText.jsx
│   │   │   ├── LeftNav.jsx + BottomNav.jsx + AppShell.jsx + PageHeader.jsx
│   │   │   ├── RightMinimal.jsx    # Trends / suggestions rail
│   │   │   ├── ProfileHeader.jsx + ProfileMedia.jsx + ProfileTabsContent.jsx + PinnedSection.jsx
│   │   │   ├── PrivateProfile.jsx + BlockedProfile.jsx + PrivacySettings.jsx + AccountData.jsx
│   │   │   ├── FollowModal.jsx + FollowRequests.jsx + UserCard.jsx
│   │   │   ├── EditProfileModal.jsx + ReportDialog.jsx + SafetyReports.jsx
│   │   │   ├── PushRegistrar.jsx + PushSettings.jsx + PushEnableBanner.jsx + OfflineBanner.jsx
│   │   │   ├── MentionAutocomplete.jsx, EmptyState.jsx, VerifyBanner.jsx
│   │   │   ├── ThemeToggle.jsx, AnimatedNumber.jsx
│   │   ├── auth/                   # AuthShell, GuestGuard, OtpInput, PasswordStrength
│   │   ├── landing/                # LandingNav, Hero, HeroVisual, LandingCloudscape, HowItWorks,
│   │   │                           #   Features, TrustSafety, Scope, FinalCTA, LandingFooter, Reveal, LandingRedirect
│   │   ├── forgeui/cloudscape.jsx  # WebGL background
│   │   ├── BrandLogo.jsx
│   │   ├── providers/query-provider.jsx  # TanStack Query provider (no top-level providers/)
│   │   └── ui/                     # shadcn/ui primitives
│   │       ├── button.jsx
│   │       ├── input.jsx
│   │       ├── checkbox.jsx
│   │       ├── label.jsx
│   │       ├── sonner.jsx          # CzToaster
│   │       ├── verified-badge.jsx
│   │       └── contribution-graph.jsx
│   │
│   ├── lib/
│   │   ├── api.js                  # Central API client (all endpoints, auto-refresh)
│   │   ├── queryClient.js
│   │   ├── hooks/queries.js + useRequireSession.js + useSSE.js + usePush.js
│   │   ├── theme.js                # cz-theme cookie read/write
│   │   ├── push.js                 # Web Push helpers
│   │   ├── media.js                # media validation (image/gif/video + posters)
│   │   ├── optimistic.js + railCache.js + avatar.js + college.js
│   │   ├── hiddenPosts.js          # LocalStorage for hidden/reported posts
│   │   └── utils.js                # cn() re-export
│   │
│   ├── .env                        # NEXT_PUBLIC_API_URL (+ NEXT_PUBLIC_VAPID_PUBLIC_KEY for Push)
│   ├── biome.json                  # Linter/formatter config
│   ├── components.json             # shadcn/ui config
│   ├── jsconfig.json               # Path alias @/*
│   ├── next.config.mjs
│   └── postcss.config.mjs
│
├── backend/                        # Express API server
│   ├── src/
│   │   ├── app.js                  # Express app setup (middleware, routes)
│   │   ├── server.js               # Entry point (DB connect, listen, shutdown)
│   │   ├── config/
│   │   │   ├── env.js              # Environment variable validation
│   │   │   ├── db.js               # MongoDB connection
│   │   │   └── appwrite.js         # Appwrite storage (avatar uploads)
│   │   ├── controllers/            # Request handlers (12 files)
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── postController.js
│   │   │   ├── followController.js
│   │   │   ├── blockController.js
│   │   │   ├── notificationController.js
│   │   │   ├── pushController.js
│   │   │   ├── reportController.js
│   │   │   ├── searchController.js
│   │   │   ├── hashtagController.js
│   │   │   ├── collegeController.js
│   │   │   └── adminController.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # protect, optionalAuth (+ protectSSE for /api/events)
│   │   │   ├── adminAuth.js        # requireAdmin (ADMIN_EMAIL + PASSKEY)
│   │   │   ├── validate.js         # Zod validation middleware
│   │   │   ├── rateLimiter.js      # Express rate limiters
│   │   │   ├── errorHandler.js     # notFound + errorHandler
│   │   │   └── upload.js           # Multer (avatarUpload, postMediaFields) → Appwrite
│   │   ├── models/                 # Mongoose schemas (18 files)
│   │   │   ├── User.js             # Profile, counts, avatar/cover, pinned, socials, badges, privacy, suspend
│   │   │   ├── Post.js             # Text 500 + imageUrl legacy + media[] (image/gif/video) + hashtags/mentions + poll
│   │   │   ├── Comment.js          # Replies
│   │   │   ├── Like.js
│   │   │   ├── Follow.js + FollowRequest.js  # Direct + private-account requests
│   │   │   ├── Repost.js
│   │   │   ├── Bookmark.js
│   │   │   ├── PollVote.js         # Per-user poll votes
│   │   │   ├── Notification.js
│   │   │   ├── Block.js
│   │   │   ├── Report.js + Appeal.js
│   │   │   ├── PushSubscription.js # Web Push (VAPID)
│   │   │   ├── Otp.js              # TTL-indexed OTPs
│   │   │   └── College.js
│   │   ├── routes/                 # Express routers (12 files)
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── postRoutes.js
│   │   │   ├── hashtagRoutes.js
│   │   │   ├── searchRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── pushRoutes.js       # VAPID public-key + subscribe/unsubscribe
│   │   │   ├── reportRoutes.js
│   │   │   ├── sseRoutes.js        # GET / + /events alias, replay buffer
│   │   │   ├── collegeRoutes.js
│   │   │   ├── adminRoutes.js      # Env-gated admin (+ verifications)
│   │   │   └── verificationRoutes.js # /api/verifications (me, request)
│   │   ├── services/               # Business logic (14 files)
│   │   │   ├── authService.js
│   │   │   ├── userService.js + privacyService.js
│   │   │   ├── postService.js
│   │   │   ├── followService.js
│   │   │   ├── blockService.js
│   │   │   ├── notificationService.js + pushService.js
│   │   │   ├── reportService.js
│   │   │   ├── searchService.js
│   │   │   ├── collegeService.js
│   │   │   ├── adminService.js
│   │   │   ├── analyticsService.js   # Post view/engagement analytics (24h/7d)
│   │   │   └── verificationService.js # Blue-tick verification requests
│   │   └── utils/                  # Shared utilities (14 files)
│   │       ├── AppError.js
│   │       ├── asyncHandler.js
│   │       ├── cookies.js
│   │       ├── email.js
│   │       ├── jwt.js
│   │       ├── otp.js
│   │       ├── cache.js
│   │       ├── hashtags.js
│   │       ├── mentions.js
│   │       ├── college.js
│   │       ├── interestTags.js       # Interest Hub taxonomy (coding, design, cybersecurity, devops, drawing, business)
│   │       ├── backfill-hashtags.js
│   │       └── backfill-mentions.js
│   │   └── models/                 # Mongoose schemas (18 files)
│   │       ├── User.js             # Profile, counts, avatar/cover, pinned, socials, badges, privacy, suspend, verification
│   │       ├── Post.js             # Text 500 + imageUrl legacy + media[] (image/gif/video) + hashtags/mentions + poll + articles + anonymous + views + sensitive
│   │       ├── Comment.js          # Replies
│   │       ├── Like.js
│   │       ├── Follow.js + FollowRequest.js  # Direct + private-account requests
│   │       ├── Repost.js
│   │       ├── Bookmark.js
│   │       ├── PollVote.js         # Per-user poll votes
│   │       ├── Notification.js
│   │       ├── Block.js
│   │       ├── Report.js + Appeal.js
│   │       ├── PushSubscription.js # Web Push (VAPID)
│   │       ├── Otp.js              # TTL-indexed OTPs
│   │       ├── College.js
│   │       ├── PostView.js         # Deduped per-user-per-day post impressions
│   │       └── VerificationRequest.js # Blue-tick appeal requests (open/approved/rejected)
│   │
│   ├── .env                        # All env vars
│   ├── .env.example                # Template for env setup
│   ├── package.json
│   └── TODO.md
```

---

## 4. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON (credentials: include)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Frontend (port 3000)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  App     │→ │  api.js      │→ │  Express API          │ │
│  │  Router  │  │  (fetch)     │  │  (port 4000)          │ │
│  └──────────┘  └──────────────┘  └──────────┬────────────┘ │
│                                              │              │
│  Route Groups:                               ▼              │
│    (auth) → login, signup, etc.    ┌──────────────────┐    │
│    app/  → authenticated shell     │   Services       │    │
│    u/    → public profiles         │   (business      │    │
│                                    │    logic)        │    │
│                                    └────────┬─────────┘    │
│                                             │              │
│                                    ┌────────▼─────────┐    │
│                                    │   Models         │    │
│                                    │   (Mongoose)     │    │
│                                    └────────┬─────────┘    │
└─────────────────────────────────────────────┼──────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │    MongoDB       │
                                    └──────────────────┘
```

### Frontend Architecture

- **Framework**: Next.js 16 App Router with React 19
- **Rendering**: All pages are client components (`"use client"`) — no SSR data fetching
- **State**: Local React state only (`useState`, `useEffect`, `useRef`, `useCallback`). No global store
- **Data Fetching**: Direct `fetch` calls via centralized `lib/api.js` object
- **Route Groups**:
  - `(auth)` — Unauthenticated pages (login, signup, forgot-password, reset-password, verify-email)
  - `app/` — Authenticated app shell with auth guard and 3-column layout
  - `u/` — Public profiles (students directory + individual profiles)

### Backend Architecture

**Pattern**: Layered MVC + Service Layer

```
Routes → Middleware (validate, rate limit, auth) → Controllers → Services → Models → MongoDB
```

| Layer | Responsibility | Key Characteristics |
|-------|---------------|---------------------|
| **Routes** | URL mapping, HTTP methods | Thin — delegate to controllers |
| **Middleware** | Cross-cutting concerns | Zod validation, JWT auth, rate limiting, error handling |
| **Controllers** | Request/response handling | Thin — wrap with `asyncHandler`, delegate to services |
| **Services** | Business logic | All complex operations live here |
| **Models** | Data access & schema | Mongoose schemas with `toSafeObject()` serialization |

---

## 5. Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.4.2+ (package manager)
- [Node.js](https://nodejs.org/) (latest LTS)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Appwrite](https://appwrite.io/) account (for avatar file storage)

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd campus-zen
```

### Backend Setup

```bash
cd backend

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, email (Resend or SMTP), Appwrite keys

# Start development server (auto-reload)
bun run dev

# Server starts on http://localhost:4000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
bun install

# Configure environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env

# Start development server
bun run dev

# App starts on http://localhost:3000
```

### Available Scripts

#### Frontend (`frontend/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start dev server with hot reload |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `biome check` | Lint code |
| `format` | `biome format --write` | Format code |

#### Backend (`backend/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `node --watch src/server.js` | Start dev server with auto-reload |
| `start` | `node src/server.js` | Start production server |
| `seed` | `node src/utils/seed.js` | Seed database with test data |

---

## 6. Frontend Deep Dive

### Path Aliases

- `@/*` maps to `frontend/*` (configured in `jsconfig.json`)

### API Client (`frontend/lib/api.js`)

The single source of truth for all API communication. Every endpoint has a corresponding method.

```javascript
import { api } from "@/lib/api";

// Authentication
api.checkUsername(username)
api.signup({ username, email, password, fullName })
api.verifyEmail({ email, otp })
api.resendOtp({ email })
api.login({ username, password })
api.logout()
api.me()
api.refresh()
api.forgotPassword({ email })
api.resetPassword({ email, otp, newPassword })

// Users
api.getUser(username)
api.listUsers(params)
api.updateMe(patchData)
api.updatePrivacy({ isPrivate, ... })
api.setDobOnce(dob) // Set date of birth once (18+ gating)
api.getIncomingRequests(params) / getOutgoingRequests(params)
api.acceptFollowRequest(id) / declineFollowRequest(id)
api.exportData() / deactivateAccount() / reactivateAccount() / deleteAccount({confirm})
api.getUserPosts(username, params)
api.getUserReplies(username, params)
api.getUserLikes(username, params)
api.getUserReposts(username, params)
api.getUserMedia(username, params)
api.uploadAvatar(file)
api.uploadCover(file)
api.followUser(id)
api.unfollowUser(id)
api.getFollowers(id, params)
api.getFollowing(id, params)
api.blockUser(id)
api.unblockUser(id)
api.getBlocks()
api.getSuggestions(params)
api.pinPost(postId)
api.unpinPost()
api.getBookmarks(params)
api.bookmarkPost(id)
api.unbookmarkPost(id)

// Posts
api.createPost(text, media, poll, extra) // media: File|File[] (image/gif/video) + extra {posters, meta}; poll {options, expiresAt}
api.createAnonymousPost(text, media, extra) // Anonymous hub: text + images only
api.getAnonymousFeed(params) // Anonymous hub feed
api.createArticle({title, description, body}, media, extra) // Long-form article
api.updateArticle(id, payload) // Update own article
api.getArticle(username, slug) // Get article by author + slug
api.getArticles(params) // List articles
api.lookupArticles(refs) // Batch lookup articles by {username, slug} refs
api.getUserArticles(username, params) // User's articles (kind=article filter)
api.votePoll(id, optionIndex)
api.getPost(id)
api.updatePost(id, text)
api.deletePost(id)
api.getFeed({ tab, cursor, limit })
api.getPublicFeed(params)
api.getHubFeed(params) // Interest Hub topic feed
api.recordPostView(id) // Record deduped impression
api.getAnalyticsOverview(range) // Author insights (24h/7d)
api.likePost(id)
api.unlikePost(id)
api.repostPost(id)
api.unrepostPost(id)
api.createReply(id, text)
api.getReplies(id, params)

// Search
api.search(params) // q, type: "all" | "users" | "posts" | "colleges"

// Hashtags
api.getTrendingHashtags(params)
api.getPostsByHashtag(tag, params)

// Notifications
api.getNotifications(params)
api.markNotificationRead(id)
api.markAllNotificationsRead()
api.deleteNotification(id)
api.clearReadNotifications()
api.getUnreadCount()

// Web Push (VAPID)
api.getPushPublicKey()
api.subscribePush(payload)
api.unsubscribePush(endpoint)
api.getPushSubscriptions()

// Reports + Appeals
api.fileReport(payload)
api.getMyReports(params)
api.appealReport(reportId, payload)
api.fileAppeal(payload)
api.getMyAppeals(params)

// Colleges
api.getCollege(slug)
api.listColleges(params)
api.getCollegeMembers(slug, params)
api.getCollegePosts(slug, params)

// Admin (adminToken cookie, no user-refresh)
api.adminLogin(payload) / adminLogout() / adminMe() / adminStats()
api.adminReports(params) / adminResolveReport(id, status)
api.adminDeletePost(id)
api.adminSuspendUser(id, reason) / adminUnsuspendUser(id)
api.adminAppeals(params) / adminReviewAppeal(id, payload)
api.adminVerifications(params) / adminReviewVerification(id, payload) / adminSetVerified(id, isVerified)

// Verification (blue tick)
api.getVerificationStatus() / api.requestVerification(payload)
```

**Key behaviors**:
- All requests include `credentials: "include"` for cookie-based auth
- Automatic token refresh on 401 — calls `api.refresh()` then retries original request (single-flight; `/api/auth/*` allowlist + `/api/admin/*` never auto-retry user refresh)
- Network failures throw with `.status=0`, `.offline=true`
- Errors thrown with `.status`, `.data`, `.details` properties
- Response format: `{ success, data?, message?, code?, details? }`

### Route Groups & Pages

#### `(auth)` Route Group — Unauthenticated

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `login/page.jsx` | Username/password login form |
| `/signup` | `signup/page.jsx` | Signup with email verification |
| `/forgot-password` | `forgot-password/page.jsx` | Request password reset OTP |
| `/reset-password` | `reset-password/page.jsx` | Reset password with OTP |
| `/verify-email` | `verify-email/page.jsx` | Email verification (6-digit OTP) |

#### `app/` Route Group — Authenticated (Auth Guard)

| Route | Component | Description |
|-------|-----------|-------------|
| `/app` | `app/page.jsx` | Home feed with Following/Discovery tabs |
| `/app/anonymous` | `app/anonymous/page.jsx` | Anonymous hub feed (hub-only posts) |
| `/app/analytics` | `app/analytics/page.jsx` | Author post insights (impressions, likes, replies, reposts, bookmarks, top posts) |
| `/app/create` | `create/page.jsx` | Create new post (500 chars + media[] + poll) |
| `/app/edit/[id]` | `app/edit/[id]/page.jsx` | Edit own post or article |
| `/app/hub` | `app/hub/page.jsx` | Interest Hub topic feed |
| `/app/notifications` | `notifications/page.jsx` | Notifications list with mark-read (SSE live) |
| `/app/search` | `search/page.jsx` | Search users + posts + colleges |
| `/app/bookmarks` | `bookmarks/page.jsx` | Saved posts |
| `/app/tag/[tag]` | `app/tag/[tag]/page.jsx` | Posts by hashtag (route `/app/tag/[tag]`) |
| `/app/a/[username]/[slug]` | `app/a/[username]/[slug]/page.jsx` | Article view by author + slug |
| `/app/menu` | `menu/page.jsx` | Settings, logout, blocked users, follow requests, privacy, push, data export |
| `/app/profile` | `profile/page.jsx` | Own profile page |
| `/app/profile/[username]` | `profile/[username]/page.jsx` | Own profile by username |
| `/app/p/[id]` | `app/p/[id]/page.jsx` | Single post view with replies |
| `/app/verified` | `app/verified/page.jsx` | Verification status + request blue tick |

#### `admin/` — Admin (env-gated)

| Route | Description |
|-------|-------------|
| `/admin` | Reports/appeals queue, stats, delete post, suspend/unsuspend (robots noindex) |

#### `c/` Route Group — Colleges (Authenticated)

| Route | Description |
|-------|-------------|
| `/c` | Colleges directory (searchable) |
| `/c/[slug]` | College page (info, members, college posts) |

#### `u/` Route Group — Public (Guest Access)

| Route | Component | Description |
|-------|-----------|-------------|
| `/u` | `u/page.jsx` | Students directory (guest blur after 20) |
| `/u/[username]` | `u/[username]/page.jsx` | Public profile page |

#### Static Pages

| Route | Description |
|-------|-------------|
| `/` | Landing/marketing page |
| `/docs` | Developer docs viewer (`app/docs/page.jsx` + `DocsRedirect.jsx`) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Key Components

#### Layout Components

| Component | Purpose |
|-----------|---------|
| `LeftNav.jsx` | Left sidebar navigation (desktop) |
| `BottomNav.jsx` | Bottom navigation bar (mobile) |
| `RightMinimal.jsx` | Right sidebar — minimal (trends/CTA) |

#### Feature Components

| Component | Purpose |
|-----------|---------|
| `PostCard.jsx` | Renders a single post with all interactions |
| `PostComposer.jsx` | Text + media[] + poll composer (with MentionAutocomplete) |
| `PostMedia.jsx` / `VideoPlayer.jsx` / `CzImage.jsx` / `ImageLightbox.jsx` | Media rendering + lightbox |
| `PollBlock.jsx` | Poll voting UI |
| `ReplyComposer.jsx` | Reply input (with MentionAutocomplete) |
| `RichText.jsx` + `MentionAutocomplete.jsx` | Hashtag/mention rendering + autocomplete |
| `ProfileHeader.jsx` | Profile banner with avatar, stats, edit button |
| `ProfileMedia.jsx` / `ProfileTabsContent.jsx` / `PinnedSection.jsx` | Profile tabs + pinned |
| `PrivateProfile.jsx` | Private-account placeholder + request button |
| `EditProfileModal.jsx` | Modal for editing profile fields |
| `FollowModal.jsx` / `FollowRequests.jsx` | Follow confirm + incoming/outgoing requests |
| `PrivacySettings.jsx` / `AccountData.jsx` | Privacy toggles + export/deactivate/delete |
| `ReportDialog.jsx` / `SafetyReports.jsx` | Report + my reports/appeals |
| `PushRegistrar.jsx` / `PushSettings.jsx` / `PushEnableBanner.jsx` | Web Push registration + settings |
| `BlockedProfile.jsx` | Blocked user placeholder |
| `UserCard.jsx` | Compact user card for lists |
| `EmptyState.jsx` | Reusable empty state with icon + action |
| `VerifyBanner.jsx` / `OfflineBanner.jsx` | Email verification / offline banners |
| `AnimatedNumber.jsx` | Number with pop-in animation |

#### Auth Components

| Component | Purpose |
|-----------|---------|
| `AuthShell.jsx` | Shared auth page wrapper |
| `GuestGuard.jsx` | Guest vs auth gating |
| `OtpInput.jsx` | 6-digit OTP input with auto-advance |
| `PasswordStrength.jsx` | Password strength indicator |

### State Management Approach

No global state library. Each page manages its own data:

```javascript
// Pattern used across all pages
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  api.getData()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

Cross-page communication uses browser events:
```javascript
// Signal notification read to other components
window.dispatchEvent(new Event("cz:notif-read"));
```

---

## 7. Backend Deep Dive

### Entry Point (`server.js`)

1. Loads environment variables (`config/env.js`)
2. Connects to MongoDB (`config/db.js`)
3. Initializes Express app (`app.js`)
4. Starts HTTP server on `PORT` (default 4000)
5. Registers graceful shutdown handlers (SIGINT/SIGTERM)

### Express App Setup (`app.js`)

The app is configured with these middleware layers (in order):

```
1. compression          — Gzip compression
2. express.json()        — JSON body parser
3. cookieParser()       — Cookie parsing
4. helmet()             — Security headers
5. cors()               — CORS (origin: FRONTEND_URL)
6. hpp()                — HTTP parameter pollution prevention
7. mongoSanitize()      — NoSQL injection prevention
8. Routes               — API route handlers
9. notFound handler     — 404 JSON response
10. errorHandler        — Central error handler
```

### Middleware Stack

#### Auth Middleware (`middleware/auth.js`)

| Export | Description |
|--------|-------------|
| `protect` | Requires valid JWT access token — returns 401 if missing/invalid |
| `optionalAuth` | Attaches user if token valid, continues regardless |
| `protectSSE` | SSE auth via cookie / `?token=` / Bearer (with `Last-Event-ID` replay) |

Admin: `middleware/adminAuth.js` `requireAdmin` (env `ADMIN_EMAIL` + `ADMIN_PASSKEY`, `adminToken` cookie).

#### Validation Middleware (`middleware/validate.js`)

Uses Zod schemas to validate request body/query/params:

```javascript
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", result.error.issues));
  req[source] = result.data;
  next();
};
```

#### Rate Limiting (`middleware/rateLimiter.js`)

Different limits per route group:

| Endpoint Group | Limit |
|---------------|-------|
| Signup | 5/hour |
| Login | 10/minute |
| Forgot/Reset password | 5/hour |
| Feed | 60/minute |
| Post create | 30/hour |
| General API | 100/minute |

#### Upload Middleware (`middleware/upload.js`)

Multer (memory → Appwrite):
- Avatar/cover: 5MB, JPEG/PNG/WebP (`avatarUpload`)
- Post media: `postMediaFields` — images, GIFs, short video + `posters[]` + `mediaMeta[]` (width/height/duration)

### Services Layer

Services contain all business logic. Controllers are thin wrappers.

#### Auth Service (`services/authService.js`)

| Method | Description |
|--------|-------------|
| `signup(data)` | Create user, send OTP email. If email fails, delete user (fail-closed) |
| `login(username, password)` | Verify credentials, set HTTP-only cookies |
| `logout(userId)` | Clear refresh token hash, clear cookies |
| `refresh(tokens)` | Rotate refresh token, issue new access token |
| `verifyEmail(email, otp)` | Verify OTP, mark email as verified |
| `resendOtp(email)` | Throttle 30s, send new OTP |
| `forgotPassword(email)` | Generate OTP, send reset email |
| `resetPassword(email, otp, newPassword)` | Verify OTP, update password, revoke all sessions |
| `checkUsername(username)` | Check availability |

#### Post Service (`services/postService.js`)

| Method | Description |
|--------|-------------|
| `createPost(userId, content)` | Create post: 500 chars + `media[]` (image/gif/video, poll mutually exclusive with media) or `poll {options 2-4, expiresAt}` |
| `getFeed(userId, tab, cursor, limit)` | Following or Discovery feed with cursor pagination |
| `getPublicFeed(cursor, limit)` | Public feed for guests |
| `getPost(postId, userId)` | Single post with like/reply status |
| `updatePost(userId, postId, content)` | Edit own post (text only) |
| `deletePost(userId, postId)` | Delete own post |
| `toggleLike(userId, postId)` | Like/unlike with partial unique index |
| `toggleRepost(userId, postId)` | Repost/unrepost |
| `createReply(userId, postId, content)` | Reply to a post |
| `getReplies(postId, cursor, limit)` | Paginated replies for a post |
| `votePoll` / `buildPoll` | Single-choice, changeable vote; counts denormalized on `Post.poll` |

#### Articles (`kind: "article"`)

Long-form posts (up to 50k char body) with `title`, `description`, `body`, `slug`, optional media. Endpoints: `POST /api/posts/articles`, `GET /api/posts/articles`, `POST /api/posts/articles/lookup`, `GET /api/posts/articles/:username/:slug`, `PATCH /api/posts/articles/:id`. Slug is unique per author. Articles appear in the articles list and article-by-slug pages, not in the regular feed.

#### Anonymous posts (`isAnonymous`)

Hub-only posts (text + images only, no polls, no video) visible only in the anonymous feed (`GET /api/posts/anonymous/feed`). Real author is stored for moderation but masked in API output (`anonAlias`). Never appear in profiles, feeds, or search.

#### Post views (`POST /api/posts/:id/view`)

Auth-only deduped impression tracking. One `PostView` document per viewer per post per UTC day (unique index prevents double-counting). `viewCount` on `Post` is the denormalized all-time total. Drives the analytics overview and post view counters.

#### Verification (blue tick)

Merit-based verification: users with 50+ posts or 100+ followers can request verification via `POST /api/verifications/request`. Admin reviews from `/admin/verifications` (`approved`/`rejected`). Approved users get `isVerified = true` on their `User` record. 7-day cooldown after rejection before re-appeal.

#### Other Services

| Service | Responsibility |
|---------|---------------|
| `userService.js` + `privacyService.js` | Profile CRUD, avatar/cover upload, stats, bookmarks, pinning, suggestions, privacy, export/deactivate/delete |
| `followService.js` | Follow/unfollow + private-account follow requests, follower/following lists, count updates |
| `blockService.js` | Block/unblock, mutual hide, auto-unfollow |
| `notificationService.js` + `pushService.js` | In-app notifications + Web Push (VAPID subscribe/unsubscribe/send) |
| `reportService.js` | Report users/posts + appeals queue |
| `searchService.js` | Full-text search across users and posts |
| `collegeService.js` | College CRUD, members, college posts |
| `hashtagService.js` | Hashtag extraction, trending, posts by hashtag |
| `analyticsService.js` | Author-only post insights: impressions (PostView), likes, replies, reposts, bookmarks over 24h/7d + top posts |
| `verificationService.js` | Blue-tick verification: eligibility (50+ posts or 100+ followers), request submission, status, cooldown |

### Utility Modules

| Module | Purpose |
|--------|---------|
| `AppError.js` | Custom error class with `statusCode`, `code`, `details`, `isOperational` |
| `asyncHandler.js` | Wraps async route handlers to catch errors |
| `cookies.js` | Set/clear auth cookies with proper flags |
| `email.js` | Nodemailer transport, send OTP/welcome/reset emails |
| `jwt.js` | Sign/verify access and refresh tokens |
| `otp.js` | Generate crypto-secure OTP, hash/verify with bcrypt |

### Error Handling

**Format**: Consistent JSON error responses

```json
{
  "success": false,
  "message": "Human-readable error",
  "code": "ERROR_CODE",
  "details": [{ "path": "field", "message": "error detail" }]
}
```

**Error sources handled**:
- Mongoose validation errors → 400
- Mongoose duplicate key → 409
- JWT expired/invalid → 401
- Multer file errors → 400/413
- Zod validation → 400
- Custom AppError → varies
- Unknown errors → 500

---

## 8. API Reference

### Base URL

```
http://localhost:4000/api
```

### Response Format

**Success**:
```json
{ "success": true, "data": { ... } }
```

**Error**:
```json
{ "success": false, "message": "...", "code": "...", "details": [...] }
```

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/check-username` | No | Check username availability |
| `POST` | `/auth/signup` | No | Create account, send OTP |
| `POST` | `/auth/verify-email` | No | Verify email with OTP |
| `POST` | `/auth/resend-otp` | No | Resend OTP (30s throttle) |
| `POST` | `/auth/login` | No | Login, set cookies |
| `POST` | `/auth/logout` | Yes | Logout, clear cookies |
| `GET` | `/auth/me` | Yes | Get current user |
| `POST` | `/auth/refresh` | Cookie | Rotate tokens |
| `POST` | `/auth/forgot-password` | No | Request password reset |
| `POST` | `/auth/reset-password` | No | Reset password with OTP |

### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/` | Optional | List users (directory, guest blur) |
| `GET` | `/users/:username` | Optional | Get user profile |
| `PATCH` | `/users/me` | Yes | Update own profile (partial; also `PUT` alias) |
| `POST` | `/users/me/dob` | Yes | Set date of birth once (18+ gating, never editable after set) |
| `PATCH` | `/users/me/privacy` | Yes | Privacy settings (private account, reply/mention policy, per-field visibility, showSensitive) |
| `GET` | `/users/me/follow-requests/incoming\|outgoing` | Yes | Follow requests |
| `POST` | `/users/me/follow-requests/:id/accept\|decline` | Yes | Accept / decline |
| `GET` | `/users/me/export` | Yes | Data export |
| `POST` | `/users/me/deactivate\|reactivate` | Yes | Deactivate / reactivate |
| `DELETE` | `/users/me` | Yes | Delete account |
| `POST` | `/users/:id/follow` | Yes | Follow user (or request if private) |
| `DELETE` | `/users/:id/follow` | Yes | Unfollow user |
| `GET` | `/users/:id/followers` | Optional | List followers |
| `GET` | `/users/:id/following` | Optional | List following |
| `POST` | `/users/:id/block` | Yes | Block user |
| `DELETE` | `/users/:id/block` | Yes | Unblock user |
| `GET` | `/users/me/blocks` | Yes | List blocked users |
| `POST` | `/users/me/avatar` | Yes | Upload avatar (multipart, 5MB, jpg/png/webp) |
| `POST` | `/users/me/cover` | Yes | Upload cover image (multipart) |
| `POST` | `/users/me/pin` | Yes | Pin a post to profile |
| `DELETE` | `/users/me/pin` | Yes | Unpin pinned post |
| `GET` | `/users/me/suggestions` | Yes | Get suggested users to follow |
| `GET` | `/users/me/bookmarks` | Yes | Get bookmarked posts |
| `GET` | `/users/:username/posts` | Optional | User's posts |
| `GET` | `/users/:username/replies` | Optional | User's replies |
| `GET` | `/users/:username/likes` | Optional | User's liked posts |
| `GET` | `/users/:username/reposts` | Optional | User's reposts |
| `GET` | `/users/:username/media` | Optional | User's media posts |

### Post Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/posts/` | Yes | Create post (text + `media[]` image/gif/video or `poll {options, expiresAt}` + optional 1-3 `interestTags`; untagged posts stay out of the hub) |
| `POST` | `/posts/anonymous` | Yes | Create anonymous hub post (text + images only, never in profiles/feeds/search) |
| `GET` | `/posts/anonymous/feed` | Yes | Anonymous hub feed (cursor-paginated) |
| `POST` | `/posts/articles` | Yes | Create article (long-form: title/description/body up to 50k chars, optional media) |
| `GET` | `/posts/articles` | Optional | List articles (paginated) |
| `POST` | `/posts/articles/lookup` | Optional | Batch lookup articles by `{username, slug}` refs (max 10) |
| `GET` | `/posts/articles/:username/:slug` | Optional | Get single article by author slug |
| `PATCH` | `/posts/articles/:id` | Yes | Update own article |
| `GET` | `/posts/?author=&likedBy=&repostedBy=&kind=` | Optional | List posts by filter (`kind=post\|article`) |
| `GET` | `/posts/feed` | Yes | Following feed — `?cursor=` for cursor paging, `?latest=1` for the new-posts peek (legacy `?page=` still honored for mobile) |
| `GET` | `/posts/public` | No | "For you" discovery feed — per-user randomized per session via seeded cursor (`?cursor=`, `?latest=1`; legacy `?page=` still honored) |
| `GET` | `/posts/hub?tag=` | No | Interest Hub topic feed (coding/design/cybersecurity/devops/drawing/business) — keyset `?cursor=`, chronological |
| `GET` | `/posts/analytics/overview?range=` | Yes | Author-only insights: impressions/likes/replies/reposts/bookmarks over 24h/7d + top posts |
| `GET` | `/posts/:id` | Optional | Get single post |
| `PATCH` | `/posts/:id` | Yes | Edit own post |
| `DELETE` | `/posts/:id` | Yes | Delete own post |
| `POST` | `/posts/:id/like` | Yes | Like post |
| `DELETE` | `/posts/:id/like` | Yes | Unlike post |
| `POST` | `/posts/:id/repost` | Yes | Repost |
| `DELETE` | `/posts/:id/repost` | Yes | Remove repost |
| `POST` | `/posts/:id/bookmark` | Yes | Bookmark post |
| `DELETE` | `/posts/:id/bookmark` | Yes | Remove bookmark |
| `POST` | `/posts/:id/view` | Yes | Record deduped impression (one per viewer per UTC day) |
| `POST` | `/posts/:id/vote` | Yes | Vote in poll (`{ optionIndex }`) |
| `POST` | `/posts/:id/replies` | Yes | Create reply |
| `GET` | `/posts/:id/replies` | Optional | Get replies |

### Search Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/search/?q=&type=` | Optional | Search (`type=all\|users\|posts\|colleges`) |

### Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications/` | Yes | List notifications (paginated) |
| `PATCH` | `/notifications/:id/read` | Yes | Mark single notification read |
| `PATCH` | `/notifications/read-all` | Yes | Mark all notifications read |
| `DELETE` | `/notifications/clear-read` | Yes | Clear read notifications |
| `DELETE` | `/notifications/:id` | Yes | Delete notification |
| `GET` | `/notifications/unread-count` | Yes | Get unread count |

### Push Endpoints (Web Push / VAPID)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/push/public-key` | No | VAPID public key |
| `POST` | `/push/subscribe` | Yes | Subscribe device |
| `DELETE` | `/push/unsubscribe` | Yes | Unsubscribe device |
| `GET` | `/push/subscriptions` | Yes | List subscriptions |

### Report Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/reports/` | Yes | Report a user or post |
| `GET` | `/reports/me` | Yes | My reports |
| `POST` | `/reports/:id/appeal` | Yes | Appeal a report |
| `POST` | `/reports/appeals` | Yes | File appeal |
| `GET` | `/reports/appeals/me` | Yes | My appeals |

### Verification Endpoints (blue tick)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/verifications/me` | Yes | My verification status + eligibility (50+ posts or 100+ followers) |
| `POST` | `/verifications/request` | Yes | Submit a verification request (message optional, max 500 chars) |

### Admin Endpoints (env-gated `ADMIN_EMAIL` + `ADMIN_PASSKEY`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/login` | No | Admin login (sets `adminToken`) |
| `POST` | `/admin/logout` | Admin | Admin logout |
| `GET` | `/admin/me` | Admin | Current admin |
| `GET` | `/admin/stats` | Admin | Platform stats |
| `GET` | `/admin/reports?status=` | Admin | Reports queue |
| `PATCH` | `/admin/reports/:id` | Admin | Resolve (`dismissed\|actioned`) |
| `GET` | `/admin/appeals` | Admin | Appeals queue |
| `PATCH` | `/admin/appeals/:id` | Admin | Review (`upheld\|rejected`) |
| `DELETE` | `/admin/posts/:id` | Admin | Delete post |
| `PATCH` | `/admin/users/:id/suspend\|unsuspend` | Admin | Suspend / unsuspend |
| `PATCH` | `/admin/users/:id/verified` | Admin | Set/revoke user verified (blue tick) |
| `GET` | `/admin/verifications?status=` | Admin | Verification requests queue |
| `PATCH` | `/admin/verifications/:id` | Admin | Review verification (`approved\|rejected`) |

### Hashtag Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/hashtags/trending` | Yes | Get trending hashtags |
| `GET` | `/hashtags/:tag/posts` | Optional | Get posts by hashtag |

### College Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/colleges/` | Optional | List/search colleges |
| `GET` | `/colleges/:slug` | Optional | Get college info |
| `GET` | `/colleges/:slug/members` | Optional | Get college members |
| `GET` | `/colleges/:slug/posts` | Optional | Get college posts |

### Realtime (SSE)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/events` (+ alias `/events/events`) | Yes (cookie/`?token`/Bearer) | SSE (`connected`, `notification`, `unread-count`, `post:update`, `follow:update`, heartbeat 25s, replay 100/user) |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/api/health` | API health check |

---

## 9. Authentication & Security

### Auth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Signup  │────→│  OTP     │────→│  Login   │────→│  Access  │
│          │     │  Email   │     │          │     │  App     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │ Access Token   │ 15 min
                              │ Refresh Token  │ 1d / 7d
                              │ (HTTP-only     │
                              │  cookie)       │
                              └────────────────┘
```

### Token Strategy

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access Token | 15 minutes | Memory (not stored) | Authenticate API requests |
| Refresh Token | 1 day (default) / 7 days (remember me) | HTTP-only cookie + SHA-256 hash in DB | Obtain new access tokens |

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt, 12 rounds |
| OTP hashing | bcrypt, 10 rounds |
| OTP expiry | 10 minutes |
| OTP max attempts | 5 |
| OTP resend throttle | 30 seconds |
| Refresh token storage | SHA-256 hash (raw token never stored) |
| Token rotation | New refresh token on every refresh; old invalidated |
| Cookie flags | `httpOnly`, `sameSite: "lax"`, `secure` in production |
| Rate limiting | Per-route limits on auth endpoints |
| Input sanitization | `express-mongo-sanitize`, `hpp`, Zod validation |
| Security headers | `helmet` |
| CORS | Restricted to `FRONTEND_URL` |
| Email restriction | Only `gmail.com` and `proton.me` domains |
| Trust proxy | Enabled for secure cookies behind nginx/Vercel |

### Password Reset Flow

1. User requests password reset → OTP sent to email
2. User submits OTP + new password
3. OTP verified → password updated → all sessions revoked (refresh token hash cleared)

---

## 10. Database Schema

### Models Overview

| Model | Collection | Purpose |
|-------|-----------|---------|
| `User` | `users` | Accounts, profiles (avatar/cover, pinned, college/course/year, socials, badges, privacy, suspend/deactivate), stats, verification (`isVerified`), accent, sensitive pref (`showSensitive`), DOB, reply/mention policy, per-field visibility |
| `Post` | `posts` | Posts (text 500 + legacy `imageUrl` + `media[]` image/gif/video + hashtags/mentions + poll) + articles (`kind`, `title`, `description`, `body`, `slug`) + anonymous (`isAnonymous`, `anonAlias`) + views (`viewCount`) + sensitive flag (`isSensitive`) + interest tags (`interestTags`) |
| `Comment` | `comments` | Replies on posts |
| `Like` | `likes` | Post likes |
| `Follow` | `follows` | Follow relationships |
| `FollowRequest` | `followrequests` | Private-account follow requests (incoming/outgoing, accept/decline) |
| `Repost` | `reposts` | Reposts |
| `Bookmark` | `bookmarks` | Saved posts |
| `PollVote` | `pollvotes` | Per-user poll votes (counts denormalized on Post) |
| `Notification` | `notifications` | Follows, likes, replies, reposts, follow-requests |
| `Block` | `blocks` | Block relationships (mutual hide) |
| `Report` | `reports` | User/post reports (open queue) |
| `Appeal` | `appeals` | Report appeals (upheld/rejected) |
| `PushSubscription` | `pushsubscriptions` | Web Push VAPID subscriptions |
| `Otp` | `otps` | One-time passwords (TTL index) |
| `College` | `colleges` | Colleges (slug, members, posts) |
| `PostView` | `postviews` | Deduped per-user-per-day post impressions (auth-only; drives `viewCount`) |
| `VerificationRequest` | `verificationrequests` | Blue-tick appeal requests (open/approved/rejected, 50+ posts or 100+ followers threshold, 7-day re-appeal cooldown) |

### Key Indexes

| Model | Index | Type |
|-------|-------|-------|
| User | `username` | Unique |
| User | `email` | Unique |
| User | `username, fullName, bio, college, course` | Text (weighted: 10/5/2/2/2) |
| User | `collegeSlug` | Single (college members) |
| Post | `createdAt` | Descending |
| Post | `author + createdAt` | Compound |
| Post | `createdAt + _id` | Compound (cursor pagination) |
| Post | `hashtags + createdAt` | Compound (tag feeds) |
| Post | `text` | Text |
| Post | `hashtags`, `mentions` | Single (filter) |
| Notification | `recipient + createdAt` | Compound |
| Notification | `recipient + read` | Compound |
| Otp | `expiresAt` | TTL (auto-delete) |
| Like | `user + post` | Compound unique (partial) |
| Follow | `follower + following` | Compound unique (partial) |
| Repost | `user + post` | Compound unique (partial) |
| PostView | `post + viewer + dayKey` | Compound unique (dedup) |
| PostView | `post + createdAt` | Compound |
| PostView | `viewer + createdAt` | Compound |
| VerificationRequest | `user + status + createdAt` | Compound |
| VerificationRequest | `status + createdAt` | Compound |

### Denormalized Counters (on User)

| Field | Description |
|-------|-------------|
| `followersCount` | Number of followers |
| `followingCount` | Number of users followed |
| `postCount` | Number of posts |

### Safe Serialization

All models include `toSafeObject()` which strips sensitive fields:
- `passwordHash`
- `refreshTokenHash`
- `__v`

---

## 11. Design System

### Source of truth

`DESIGN.md` + `frontend/app/globals.css`. X-style monochrome with one
chromatic accent, hairline borders (never shadows for cards), two radii
(16px cards / 9999px interactive), Inter with `ss01`.

### Design Tokens (light `:root` / dark `.dark`)

All visual properties are CSS custom properties in `globals.css`.
The root layout reads the `cz-theme` cookie and stamps `.dark` on
`<html>` server-side, so first paint is already correct.

#### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--cz-bg` | `#ffffff` | `#000000` | Page background |
| `--cz-surface` / `--cz-elevated` | `#ffffff` | `#000000` / `#162327` | Cards, modals, menus |
| `--cz-surface-strong` | `#eff3f4` | `#16181c` | Hover, secondary fills |
| `--cz-text-primary` | `#0f1419` | `#e7e9ea` | Primary text |
| `--cz-text-secondary` | `#536471` | `#71767b` | Secondary text |
| `--cz-text-tertiary` | `#829aab` | `#536471` | Tertiary/disabled |
| `--cz-border` | `#eff3f4` | `#2f3336` | Hairline dividers |
| `--cz-border-strong` | `#cfd9de` | `#536471` | Control strokes |
| `--cz-accent` | `#1d9bf0` | `#1d9bf0` | The one chromatic colour — interactive only |
| `--cz-error` | `#f4212e` | `#f4212e` | Error states |
| `--cz-like` | `#f91880` | `#f91880` | Like active |
| `--cz-repost` / `--cz-success` | `#00ba7c` | `#00ba7c` | Repost / success |

Engagement colours are semantic, not decoration. See `DESIGN.md`
for the full token list (type scale, spacing, radii, shadows, motion).

#### Typography

| Property | Value |
|----------|-------|
| Font family | Inter (TwitterChirp substitute), `ss01` + `cv11` |
| Monospace | System mono stack (`--font-jetbrains`) for ids/slugs/OTPs only |
| Base size | 15px / 20px body, 20px/23px headings |
| Weights | 400 / 500 / 700 / 800 |

#### Component Classes

| Class | Purpose |
|-------|---------|
| `.cz-card` | Card container with surface bg + border |
| `.cz-input` | Form input styling (with hover/focus states) |

#### Animation Classes

| Class | Purpose |
|-------|---------|
| `.t-input` / `.is-error` / `.is-shaking` | Input states with shake animation |
| `.t-icon-swap` | Icon swap (eye/eye-off) |
| `.t-check` | Custom checkbox with draw animation |
| `.t-stagger-line` | Text reveal with stagger animation |
| `.t-success-check` | Success checkmark animation |
| `.t-modal` / `.is-open` / `.is-closing` | Modal animations |
| `.t-digit-group` / `.t-digit` | Number pop-in animation |
| `.t-panel-slide` | Panel slide-in animation |
| `.t-like` / `.t-like-heart` / `.t-like-particles` | Like button with particle burst |

### Animations

CSS keyframe animations for micro-interactions:

| Animation | Purpose |
|-----------|---------|
| `shake` | Form validation error |
| `icon-swap` | Password visibility toggle |
| `stagger-reveal` | List item entrance |
| `like-pop` | Like button interaction |
| `panel-slide` | Modal/drawer entrance |
| `digit-pop-in` | Animated number counter |
| `success-check` | Success state checkmark |

All animations respect `prefers-reduced-motion: reduce`.

### Motion Tokens

| Token | Value | Purpose |
|-------|-------|----------|
| `--duration-micro` | 80ms | Quick transitions |
| `--duration-quick` | 150ms | Standard transitions |
| `--duration-fast` | 250ms | Modal open/close |
| `--duration-medium` | 350ms | Panel reveals |
| `--duration-slow` | 400ms | Page transitions |
| `--duration-very-slow` | 500ms | Stagger reveals |
| `--like-pop` | 350ms | Like button pop |
| `--like-particle-dur` | 600ms | Like particle burst |

### Accessibility

- WCAG 2.2 AA target
- Keyboard-first interactions
- Visible focus rings via `*:focus-visible`
- Semantic HTML throughout

---

## 12. Conventions & Patterns

### Naming Conventions

| Element | Convention | Examples |
|---------|-----------|----------|
| Frontend components | PascalCase | `PostCard.jsx`, `LeftNav.jsx` |
| Frontend pages | lowercase | `page.jsx`, `layout.jsx` |
| Backend files | camelCase | `authController.js`, `authService.js` |
| CSS classes | kebab-case | `.cz-card`, `.t-input` |
| CSS variables | `--cz-*` prefix | `--cz-bg`, `--cz-text-primary` |
| API client methods | camelCase | `api.getUser()`, `api.createPost()` |
| DB models | PascalCase | `User`, `Post`, `Notification` |
| DB fields | camelCase | `fullName`, `isEmailVerified` |
| API routes | kebab-case | `/check-username`, `/forgot-password` |
| Error codes | UPPER_SNAKE_CASE | `USERNAME_TAKEN`, `VALIDATION_ERROR` |

### Frontend Patterns

| Pattern | Implementation |
|---------|---------------|
| Debounced search | 300-400ms `setTimeout`/`clearTimeout` + `AbortController` |
| Infinite scroll | `IntersectionObserver` with sentinel div |
| Optimistic UI | Post creation inserts at top immediately; follow updates counts instantly |
| Input shake | CSS keyframe shake on validation error |
| Icon swap | CSS-only eye/eye-off toggle for password visibility |
| Loading skeletons | `animate-pulse` placeholder divs |
| Empty states | Reusable `EmptyState` component |
| Guest vs auth | `isGuest` flag controls UI (blur overlays, CTA banners) |
| TanStack Query | Server state management with `query-provider.jsx` |
| URL params | Query params for pagination filters (built into api.js) |

### Backend Patterns

| Pattern | Implementation |
|---------|---------------|
| Service layer | All business logic in services; controllers are thin |
| asyncHandler | Wraps async route handlers to catch errors |
| AppError class | Custom error with `statusCode`, `code`, `details`, `isOperational` |
| Fail-closed email | If OTP delivery fails, the new user row and OTP are rolled back; no session is issued |
| Token rotation | New refresh token on every refresh; old invalidated |
| Consistent error format | `{ success: false, message, code?, details?, meta?, stack? }` |
| Rate limiting per route | Different limits for signup, login, feed, etc. |
| Zod validation | Reusable `validate(schema, source)` middleware |
| Partial unique indexes | For Like/Follow/Repost to prevent duplicates |
| SSE events | Server-Sent Events for real-time notifications at `/api/events` |
| Cache layer | In-memory caching via `utils/cache.js` for frequently accessed data |

---

## 13. Deployment

### Frontend (Vercel recommended)

```bash
cd frontend
bun run build
# Deploy .vercel/ directory or connect Git repo to Vercel
```

**Environment variables for production**:
- `NEXT_PUBLIC_API_URL` — Production backend URL
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push public key (must match backend `VAPID_PUBLIC_KEY`)

### Backend (Any Node.js host)

```bash
cd backend
bun install --production
bun run start
```

**Environment variables for production**:
- `NODE_ENV=production`
- `PORT` — Server port
- `MONGO_URI` — Production MongoDB connection string
- `JWT_ACCESS_SECRET` — 32+ character random string
- `JWT_REFRESH_SECRET` — 32+ character random string
- `FRONTEND_URL` — Production frontend URL (for CORS)
- `COOKIE_SECURE=true` — Enable secure cookies (`COOKIE_SAMESITE=none` only when frontend + API are on different hosts)
- `RESEND_API_KEY` + `EMAIL_FROM` — Resend API key and a sender on a domain verified in Resend (preferred OTP transport)
- `SMTP_*` — Optional fallback: Gmail SMTP credentials (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`; `SMTP_FROM` overrides the fallback sender)
- `APPWRITE_*` — Appwrite storage credentials (`APPWRITE_ENDPOINT/PROJECT_ID/API_KEY/BUCKET_ID`, optional `APPWRITE_VIDEO_BUCKET_ID`)
- `ADMIN_EMAIL` + `ADMIN_PASSKEY` — Enable `/api/admin/*` + `/admin` (optional `ADMIN_TOKEN_EXPIRES`)
- `VAPID_PUBLIC/PRIVATE_KEY/SUBJECT` — Web Push (public key also goes to frontend)
- `OWNER_EMAIL` + `COFOUNDER_EMAIL` — Owner/cofounder badge sync (red/lavender badge, set on User pre-save)

### Production Checklist

- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Use strong JWT secrets (32+ chars)
- [ ] Configure MongoDB Atlas or production DB
- [ ] Set up Appwrite bucket for avatar storage
- [ ] Configure Resend (`RESEND_API_KEY` + verified-domain `EMAIL_FROM`) or Gmail SMTP app password
- [ ] Enable `trust proxy` (already set in code)
- [ ] Set up reverse proxy (nginx) if needed
- [ ] Test graceful shutdown

---

## 14. Testing

### Current Status

**No tests are currently implemented.** This is consistent with the MVP stage of the project.

### Recommended Testing Stack

| Layer | Recommended Tool |
|-------|-----------------|
| Backend unit tests | Vitest or Jest |
| Backend API tests | Supertest |
| Frontend unit tests | Vitest + React Testing Library |
| Frontend E2E | Playwright |

### Key Areas to Test

1. **Auth flow** — signup, OTP verification, login, token refresh, password reset
2. **Post CRUD** — create, read, update, delete with validation
3. **Follow/unfollow** — count updates, duplicate prevention
4. **Block/unblock** — mutual hide, auto-unfollow
5. **Search** — text index accuracy, pagination
6. **Rate limiting** — verify limits are enforced
7. **Error handling** — consistent error format across all endpoints

---

## 15. Useful Files Map

| I need to... | Go to... |
|-------------|----------|
| Understand product requirements | `PRD.md` |
| Understand design system | `DESIGN.md` |
| Find any API endpoint | `frontend/lib/api.js` |
| Change styling/design tokens | `frontend/app/globals.css` |
| Add a new page | `frontend/app/` (create route group or folder; admin lives in `app/admin/`) |
| Add a new component | `frontend/components/app/` |
| Modify auth logic | `backend/src/services/authService.js` |
| Modify privacy / follow-requests / export / deactivate | `backend/src/services/privacyService.js` + `followService.js` |
| Modify push notifications | `backend/src/services/pushService.js` + `frontend/lib/push.js` |
| Modify post views / analytics | `backend/src/services/analyticsService.js` + `backend/src/models/PostView.js` |
| Modify verification (blue tick) | `backend/src/services/verificationService.js` + `backend/src/models/VerificationRequest.js` + `backend/src/routes/verificationRoutes.js` |
| Modify admin moderation | `backend/src/services/adminService.js` + `frontend/app/admin/page.jsx` |
| Modify articles / anonymous posts | `backend/src/services/postService.js` + `backend/src/controllers/postController.js` + `frontend/app/app/a/` + `frontend/app/app/anonymous/` |
| Modify interest hub tags | `backend/src/utils/interestTags.js` (MIRRORED in `frontend/lib/interestTags.js`) |
| Add a new DB model | `backend/src/models/` |
| Add a new API route | `backend/src/routes/` + `backend/src/app.js` |
| Change validation rules | `backend/src/middleware/validate.js` + route files |
| Modify email templates | `backend/src/utils/email.js` (email-only `#ffcead` on `#0c122c` theme) |
| Change rate limits | `backend/src/middleware/rateLimiter.js` + `backend/src/routes/postRoutes.js` (createLimiter) |
| Configure shadcn/ui | `frontend/components.json` |
| Configure linter/formatter | `frontend/biome.json` |
| Set up environment variables | `backend/.env.example` (+ `frontend/.env` for `NEXT_PUBLIC_*`) |
| Understand auth middleware | `backend/src/middleware/auth.js` (+ `adminAuth.js` for admin) |
| Understand error handling | `backend/src/middleware/errorHandler.js` |
| Understand JWT strategy | `backend/src/utils/jwt.js` |
| Understand OTP strategy | `backend/src/utils/otp.js` |

---

*Last updated: October 24, 2026*
