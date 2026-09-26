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
| **Brand Aesthetic** | Dark theme, warm peach accent (`#ffcead`), monospace font (JetBrains Mono) |

### Product Flow

```
Sign Up → Verify Email (OTP) → Login → Discover Students → Follow → Post → Interact → Return
```

### Related Documents

- **[PRD.md](./PRD.md)** — Full Product Requirements Document (846 lines)
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
| UI Components | shadcn/ui (base-nova style) | ^4.21.0 |
| Animations | Framer Motion + Motion | ^13.4.3 / ^13.4.4 |
| Icons | lucide-react | 0.511.0 |
| Date utilities | date-fns | ^4.4.0 |
| Class utilities | clsx, tailwind-merge, cn, class-variance-authority | various |
| Base UI | @base-ui/react | ^1.8.0 |
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
| Email | Nodemailer (Gmail SMTP) | ^10.0.10 |
| File storage | Appwrite (server-side SDK) | ^28.0.0 |
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
│   │   ├── layout.js               # Root layout (font, metadata)
│   │   ├── page.js                 # Landing page (marketing)
│   │   ├── globals.css             # Tailwind + design tokens + animations
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
│   │   │   ├── create/page.jsx     # Create post
│   │   │   ├── notifications/      # Notifications page
│   │   │   ├── search/             # Search (users + posts)
│   │   │   ├── menu/               # Menu/settings/logout
│   │   │   ├── profile/            # Own profile
│   │   │   │   └── [username]/
│   │   │   └── p/                  # Single post view
│   │   ├── u/                      # Public profiles
│   │   │   ├── page.jsx            # Students directory
│   │   │   └── [username]/page.jsx
│   │   ├── privacy/page.jsx
│   │   └── terms/page.jsx
│   │
│   ├── components/
│   │   ├── app/                    # Feature-specific components
│   │   │   ├── PostCard.jsx
│   │   │   ├── PostComposer.jsx
│   │   │   ├── LeftNav.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   ├── RightMinimal.jsx
│   │   │   ├── ProfileHeader.jsx
│   │   │   ├── EditProfileModal.jsx
│   │   │   ├── FollowModal.jsx
│   │   │   ├── ReportDialog.jsx
│   │   │   ├── BlockedProfile.jsx
│   │   │   ├── UserCard.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── VerifyBanner.jsx
│   │   │   └── AnimatedNumber.jsx
│   │   ├── auth/                   # Auth-specific components
│   │   │   ├── AuthShell.jsx
│   │   │   ├── OtpInput.jsx
│   │   │   └── PasswordStrength.jsx
│   │   ├── landing/
│   │   │   └── LandingRedirect.jsx
│   │   └── ui/                     # shadcn/ui primitives
│   │       ├── button.jsx
│   │       ├── input.jsx
│   │       ├── checkbox.jsx
│   │       ├── label.jsx
│   │       ├── verified-badge.jsx
│   │       └── contribution-graph.jsx
│   │
│   ├── lib/
│   │   ├── api.js                  # Central API client (all endpoints)
│   │   ├── appwrite.js             # Deprecated (moved to backend)
│   │   ├── hiddenPosts.js          # LocalStorage for hidden posts
│   │   └── utils.js                # cn() re-export
│   │
│   ├── .env                        # NEXT_PUBLIC_API_URL
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
│   │   ├── controllers/            # Request handlers (8 files)
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── postController.js
│   │   │   ├── followController.js
│   │   │   ├── blockController.js
│   │   │   ├── notificationController.js
│   │   │   ├── reportController.js
│   │   │   └── searchController.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # protect, optionalAuth, authorize
│   │   │   ├── validate.js         # Zod validation middleware
│   │   │   ├── rateLimiter.js      # Express rate limiters
│   │   │   ├── errorHandler.js     # notFound + errorHandler
│   │   │   └── upload.js           # Multer avatar upload
│   │   ├── models/                 # Mongoose schemas (10 files)
│   │   │   ├── User.js
│   │   │   ├── Post.js
│   │   │   ├── Comment.js
│   │   │   ├── Like.js
│   │   │   ├── Follow.js
│   │   │   ├── Repost.js
│   │   │   ├── Notification.js
│   │   │   ├── Block.js
│   │   │   ├── Report.js
│   │   │   └── Otp.js
│   │   ├── routes/                 # Express routers (6 files)
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── postRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   └── searchRoutes.js
│   │   ├── services/               # Business logic (8 files)
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── postService.js
│   │   │   ├── followService.js
│   │   │   ├── blockService.js
│   │   │   ├── notificationService.js
│   │   │   ├── reportService.js
│   │   │   └── searchService.js
│   │   └── utils/                  # Shared utilities (6 files)
│   │       ├── AppError.js
│   │       ├── asyncHandler.js
│   │       ├── cookies.js
│   │       ├── email.js
│   │       ├── jwt.js
│   │       └── otp.js
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
# Edit .env with your MongoDB URI, JWT secrets, SMTP credentials, Appwrite keys

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
api.signup({ username, email, password, fullName })
api.login({ username, password })
api.logout()
api.me()
api.refresh()
api.verifyEmail({ email, otp })
api.resendOtp({ email })
api.forgotPassword({ email })
api.resetPassword({ email, otp, newPassword })

// Users
api.getUser(username)
api.updateUser(patchData)
api.uploadAvatar(file)
api.followUser(userId)
api.unfollowUser(userId)
api.getBlockedUsers()

// Posts
api.createPost({ content })
api.getFeed({ tab, cursor, limit })
api.getPost(postId)
api.deletePost(postId)
api.toggleLike(postId)
api.toggleRepost(postId)
api.createReply(postId, { content })
api.getReplies(postId)

// Search
api.search(query, type) // type: "users" | "posts"

// Notifications
api.getNotifications(cursor, limit)
api.markNotificationRead(notificationId)
api.markAllNotificationsRead()
api.getUnreadNotificationCount()
```

**Key behaviors**:
- All requests include `credentials: "include"` for cookie-based auth
- Automatic token refresh on 401 — calls `api.refresh()` then retries original request
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
| `/app/create` | `create/page.jsx` | Create new post (500 char limit) |
| `/app/notifications` | `notifications/page.jsx` | Notifications list with mark-read |
| `/app/search` | `search/page.jsx` | Search users + posts |
| `/app/menu` | `menu/page.jsx` | Settings, logout, blocked users |
| `/app/profile` | `profile/page.jsx` | Own profile page |
| `/app/profile/[username]` | `profile/[username]/page.jsx` | Own profile by username |
| `/app/p/[postId]` | `p/[postId]/page.jsx` | Single post view with replies |

#### `u/` Route Group — Public (Guest Access)

| Route | Component | Description |
|-------|-----------|-------------|
| `/u` | `u/page.jsx` | Students directory (guest blur after 20) |
| `/u/[username]` | `u/[username]/page.jsx` | Public profile page |

#### Static Pages

| Route | Description |
|-------|-------------|
| `/` | Landing/marketing page |
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
| `PostComposer.jsx` | Text input area for creating posts |
| `ProfileHeader.jsx` | Profile banner with avatar, stats, edit button |
| `EditProfileModal.jsx` | Modal for editing profile fields |
| `FollowModal.jsx` | Modal for follow/unfollow confirmation |
| `ReportDialog.jsx` | Dialog for reporting users/posts |
| `BlockedProfile.jsx` | Blocked user placeholder |
| `UserCard.jsx` | Compact user card for lists |
| `EmptyState.jsx` | Reusable empty state with icon + action |
| `VerifyBanner.jsx` | Email verification reminder banner |
| `AnimatedNumber.jsx` | Number with pop-in animation |

#### Auth Components

| Component | Purpose |
|-----------|---------|
| `AuthShell.jsx` | Shared auth page wrapper |
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
| `authorize(...roles)` | Role-based access control |

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
| General API | 100/minute |

#### Upload Middleware (`middleware/upload.js`)

Multer configuration for avatar uploads:
- File size limit: 5MB
- Allowed types: JPEG, PNG, WebP
- Storage: Memory (streams to Appwrite)

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
| `createPost(userId, content)` | Create post with 500 char limit |
| `getFeed(userId, tab, cursor, limit)` | Following or Discovery feed with cursor pagination |
| `getPublicFeed(cursor, limit)` | Public feed for guests |
| `getPost(postId, userId)` | Single post with like/reply status |
| `updatePost(userId, postId, content)` | Edit own post |
| `deletePost(userId, postId)` | Delete own post |
| `toggleLike(userId, postId)` | Like/unlike with partial unique index |
| `toggleRepost(userId, postId)` | Repost/unrepost |
| `createReply(userId, postId, content)` | Reply to a post |
| `getReplies(postId, cursor, limit)` | Paginated replies for a post |

#### Other Services

| Service | Responsibility |
|---------|---------------|
| `userService.js` | Profile CRUD, avatar upload, user stats |
| `followService.js` | Follow/unfollow, follower/following lists, count updates |
| `blockService.js` | Block/unblock, mutual hide, auto-unfollow |
| `notificationService.js` | Create/fetch notifications, mark read |
| `reportService.js` | Report users/posts |
| `searchService.js` | Full-text search across users and posts |

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
| `POST` | `/auth/signup` | No | Create account, send OTP |
| `POST` | `/auth/login` | No | Login, set cookies |
| `POST` | `/auth/logout` | Yes | Logout, clear cookies |
| `GET` | `/auth/me` | Yes | Get current user |
| `POST` | `/auth/refresh` | Cookie | Rotate tokens |
| `POST` | `/auth/verify-email` | No | Verify email with OTP |
| `POST` | `/auth/resend-otp` | No | Resend OTP (30s throttle) |
| `POST` | `/auth/forgot-password` | No | Request password reset |
| `POST` | `/auth/reset-password` | No | Reset password with OTP |
| `GET` | `/auth/check-username` | No | Check username availability |

### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/` | Yes | List users (directory) |
| `GET` | `/users/:username` | Optional | Get user profile |
| `PATCH` | `/users/me` | Yes | Update own profile (partial) |
| `PUT` | `/users/me` | Yes | Replace own profile |
| `POST` | `/users/:id/follow` | Yes | Follow user |
| `DELETE` | `/users/:id/follow` | Yes | Unfollow user |
| `GET` | `/users/:id/followers` | Optional | List followers |
| `GET` | `/users/:id/following` | Optional | List following |
| `POST` | `/users/:id/block` | Yes | Block user |
| `DELETE` | `/users/:id/block` | Yes | Unblock user |
| `GET` | `/users/me/blocks` | Yes | List blocked users |
| `POST` | `/users/me/avatar` | Yes | Upload avatar (multipart) |
| `GET` | `/users/:username/posts` | Optional | User's posts |
| `GET` | `/users/:username/replies` | Optional | User's replies |
| `GET` | `/users/:username/likes` | Optional | User's liked posts |
| `GET` | `/users/:username/reposts` | Optional | User's reposts |
| `GET` | `/users/:username/media` | Optional | User's media posts |

### Post Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/posts/` | Yes | Create post |
| `GET` | `/posts/` | Yes | Get feed (tab=following/discovery) |
| `GET` | `/posts/feed` | Yes | Alias for feed |
| `GET` | `/posts/public` | No | Public feed (guests) |
| `GET` | `/posts/:id` | Optional | Get single post |
| `PATCH` | `/posts/:id` | Yes | Edit own post |
| `DELETE` | `/posts/:id` | Yes | Delete own post |
| `POST` | `/posts/:id/like` | Yes | Like post |
| `DELETE` | `/posts/:id/like` | Yes | Unlike post |
| `POST` | `/posts/:id/repost` | Yes | Repost |
| `DELETE` | `/posts/:id/repost` | Yes | Remove repost |
| `POST` | `/posts/:id/replies` | Yes | Create reply |
| `GET` | `/posts/:id/replies` | Optional | Get replies |

### Search Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/search/?q=&type=` | Yes | Search users (type=users) or posts (type=posts) |

### Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications/` | Yes | List notifications (paginated) |
| `PATCH` | `/notifications/:id/read` | Yes | Mark single notification read |
| `PATCH` | `/notifications/read-all` | Yes | Mark all notifications read |
| `GET` | `/notifications/unread-count` | Yes | Get unread count |

### Report Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/reports/` | Yes | Report a user or post |

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
| `User` | `users` | User accounts, profiles, stats |
| `Post` | `posts` | Posts (text-only MVP) |
| `Comment` | `comments` | Comments on posts |
| `Like` | `likes` | Post likes |
| `Follow` | `follows` | Follow relationships |
| `Repost` | `reposts` | Reposts |
| `Notification` | `notifications` | User notifications |
| `Block` | `blocks` | Block relationships |
| `Report` | `reports` | User/post reports |
| `Otp` | `otps` | One-time passwords (TTL index) |

### Key Indexes

| Model | Index | Type |
|-------|-------|-------|
| User | `username` | Unique |
| User | `email` | Unique |
| User | `username, fullName, bio, college, course` | Text (weighted: 10/5/2/2/2) |
| Post | `createdAt` | Descending |
| Post | `author + createdAt` | Compound |
| Post | `text` | Text |
| Notification | `recipient + createdAt` | Compound |
| Notification | `recipient + read` | Compound |
| Otp | `expiresAt` | TTL (auto-delete) |
| Like | `user + post` | Compound unique (partial) |
| Follow | `follower + following` | Compound unique (partial) |
| Repost | `user + post` | Compound unique (partial) |

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

### Design Tokens

All visual properties are defined as CSS custom properties in `globals.css`:

#### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--cz-bg` | `#000000` | Page background |
| `--cz-surface` | `#0c122c` | Card/panel background |
| `--cz-surface-strong` | `#1a2340` | Elevated surface |
| `--cz-text-primary` | `#ffffff` | Primary text |
| `--cz-text-secondary` | `#8892b0` | Secondary/muted text |
| `--cz-text-inverse` | `#000000` | Text on accent |
| `--cz-border` | `#1e2a4a` | Borders/dividers |
| `--cz-muted` | `#162040` | Muted backgrounds |
| `--cz-accent` | `#ffcead` | Primary accent (peach) |
| `--cz-error` | `#ff6b6b` | Error states |
| `--cz-success` | `#51cf66` | Success states |

#### Typography

| Property | Value |
|----------|-------|
| Font family | JetBrains Mono (monospace) |
| Base size | 15px |
| Tracking | Tight |

#### Component Classes

| Class | Purpose |
|-------|---------|
| `.cz-card` | Card container with surface bg + border |
| `.cz-input` | Form input styling |
| `.cz-btn-primary` | Primary action button |
| `.cz-btn-secondary` | Secondary action button |

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

### Backend Patterns

| Pattern | Implementation |
|---------|---------------|
| Service layer | All business logic in services; controllers are thin |
| asyncHandler | Wraps async route handlers to catch errors |
| AppError class | Custom error with `statusCode`, `code`, `details`, `isOperational` |
| Fail-closed email | OTP sent before user creation; if email fails, user deleted |
| Token rotation | New refresh token on every refresh; old invalidated |
| Consistent error format | `{ success: false, message, code?, details?, stack? }` |
| Rate limiting per route | Different limits for signup, login, feed, etc. |
| Zod validation | Reusable `validate(schema, source)` middleware |
| Partial unique indexes | For Like/Follow/Repost to prevent duplicates |

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
- `COOKIE_SECURE=true` — Enable secure cookies
- `SMTP_*` — Gmail SMTP credentials
- `APPWRITE_*` — Appwrite storage credentials

### Production Checklist

- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Use strong JWT secrets (32+ chars)
- [ ] Configure MongoDB Atlas or production DB
- [ ] Set up Appwrite bucket for avatar storage
- [ ] Configure Gmail SMTP app password
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
| Add a new page | `frontend/app/` (create route group or folder) |
| Add a new component | `frontend/components/app/` |
| Modify auth logic | `backend/src/services/authService.js` |
| Add a new DB model | `backend/src/models/` |
| Add a new API route | `backend/src/routes/` + `backend/src/app.js` |
| Change validation rules | `backend/src/middleware/validate.js` + route files |
| Modify email templates | `backend/src/utils/email.js` |
| Change rate limits | `backend/src/middleware/rateLimiter.js` |
| Configure shadcn/ui | `frontend/components.json` |
| Configure linter/formatter | `frontend/biome.json` |
| Set up environment variables | `backend/.env.example` |
| Understand auth middleware | `backend/src/middleware/auth.js` |
| Understand error handling | `backend/src/middleware/errorHandler.js` |
| Understand JWT strategy | `backend/src/utils/jwt.js` |
| Understand OTP strategy | `backend/src/utils/otp.js` |

---

*Last updated: September 26, 2026*
