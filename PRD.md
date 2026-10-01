# CampusZen — Product Requirements Document

**Product:** CampusZen  
**Type:** Student-focused social media web application  
**Inspiration:** X-style social networking, adapted for college students  
**Status:** MVP complete (September 2026)  
**Primary goal:** Build a focused social platform where students can discover people, share thoughts, and interact around student life, technology, academics, and campus culture.

---

## 1. Product Vision

CampusZen is a social media platform designed specifically for students.

The initial product should focus on one strong social loop:

> **Sign up → discover students → follow people → post → interact → return**

CampusZen should feel familiar to users of modern social platforms while providing a student-centric identity.

The MVP should intentionally remain small. Features such as communities, realtime chat, clips, events, virtual currency, and advanced recommendations will be introduced only after the core social experience is stable.

---

# 2. Target Users

## Primary Users

- College students
- University students
- Students interested in technology, academics, campus life, gaming, careers, and entertainment
- Students who want to connect with other students

## Initial Geographic Focus

India.

The architecture should remain flexible enough to support students from other countries later.

---

# 3. Core Problems

CampusZen aims to address:

1. Students need a place to discover and connect with other students.
2. General social networks are not specifically designed around student communities.
3. Students want to share campus-related thoughts, questions, achievements, and experiences.
4. Students need an easy way to discover people with similar academic or personal interests.
5. Student-focused communities often become fragmented across multiple platforms.

---

# 4. Product Principles

### Simple first

The MVP should provide a small number of polished features instead of many incomplete features.

### Student-first

Product decisions should prioritize student use cases rather than copying every feature from general-purpose social networks.

### Fast

The application should feel responsive on low-to-mid-range devices and normal Indian mobile networks.

### Secure

Authentication, authorization, validation, rate limiting, and moderation should be treated as core functionality.

### Extensible

The backend and database architecture should make future features possible without requiring a complete rewrite.

---

# 5. Technology Stack

## Frontend

- Next.js
- React
- JavaScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- GSAP where animation requires it

## Backend

- Node.js
- Express.js
- JavaScript
- Zod for request validation

## Database

- MongoDB
- Mongoose

## Package Manager

- Bun

## Repository Structure

```text
campusZen/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── ...
│
├── README.md
├── PRD.md
└── ...
```

There should be no root-level package installation or workspace requirement for the initial project.

Frontend and backend should maintain their own dependencies and `package.json` files.

---

# 6. MVP Scope

The MVP is the minimum version required to validate CampusZen's core social experience.

## MVP User Flow

```text
Landing Page
     ↓
Sign Up / Login
     ↓
Create Profile
     ↓
Discover Students
     ↓
Follow Users
     ↓
Home Feed
     ↓
Create Post
     ↓
Like / Reply / Repost
     ↓
Notifications
     ↓
Return to CampusZen
```

---

# 7. Authentication

## Requirements

Users should be able to:

- Create an account
- Log in
- Log out
- View their current session
- Reset their password
- Verify their email
- Access protected routes

## Security Requirements

- Passwords must never be stored in plain text.
- Passwords must be securely hashed.
- Authentication should use secure HTTP-only cookies.
- Sensitive authentication endpoints should be rate limited.
- Request bodies should be validated with Zod.
- Authorization must be checked on protected backend routes.
- Users must not be able to modify another user's account.

---

# 8. User Profile

Each user should have:

- Profile picture
- Display name
- Username
- Bio
- College
- Course/branch
- Academic year
- Followers count
- Following count
- Post count

## Profile Actions

Users can:

- Edit their profile
- Follow another user
- Unfollow another user
- View another user's profile
- View their own posts

Example:

```text
Ayush
@user_synax

Full-stack developer
Building CampusZen

XYZ College
B.Tech CSE · 2nd Year

42 Followers · 18 Following
```

---

# 9. Posts

Posts are the primary content type in the MVP.

## MVP Post

A post contains:

- Author
- Text
- Created timestamp
- Updated timestamp
- Like count
- Reply count
- Repost count

## Post Requirements

Users can:

- Create a post
- Edit their own post
- Delete their own post
- Like a post
- Unlike a post
- Reply to a post
- Repost a post

## Initial Limit

Recommended initial text limit:

```text
500 characters
```

Media uploads can be introduced after the text-only posting system is stable.

---

# 10. Home Feed

The initial feed should remain simple.

## Following Feed

Show recent posts from:

- Users the current user follows
- Optionally the user's own posts

Sort primarily by:

```text
createdAt DESC
```

## Discovery Feed

A basic public feed can expose recent public posts from other users.

Do not build a complex recommendation algorithm for the MVP.

---

# 11. Interactions

The MVP should support:

### Like

Users can like and unlike posts.

### Reply

Users can reply to posts.

### Repost

Users can repost existing posts.

These interactions establish the initial social graph.

---

# 12. Follow System

Users can:

- Follow users
- Unfollow users
- View followers
- View following

The follow system should be designed so duplicate follows cannot occur.

---

# 13. Search

The MVP should provide basic search.

Search targets:

- Users
- Posts

Example:

```text
/search?q=javascript
```

Search results should provide enough information to open a profile or post.

Advanced search filters can be introduced later.

---

# 14. Notifications

The MVP should provide an in-app notification system.

Notifications should be generated for:

- New follower
- Post like
- Post reply
- Repost

Example:

```text
Rahul liked your post.
Priya followed you.
Arjun replied to your post.
```

Realtime push notifications are not required for the MVP.

---

# 15. Moderation and Safety

Even the MVP needs basic moderation.

## User Actions

Users can:

- Report a post
- Report a user
- Block a user
- Delete their own content

## Admin Actions

Admins should eventually be able to:

- View reports
- Delete reported posts
- Suspend users
- Review reported accounts
- Manage basic platform content

The first implementation can be simple and does not require a large moderation system.

---

# 16. UI / UX

## Desktop

Recommended structure:

```text
┌─────────────┬──────────────────────┬──────────────────┐
│ Navigation  │        Feed          │    Discovery     │
│             │                      │                  │
│ Home        │ Create Post          │ Trending         │
│ Search      │ ─────────────────    │ Suggested Users  │
│ Profile     │ Post                 │                  │
│             │ ❤️ 12 💬 4 🔁 2     │                  │
└─────────────┴──────────────────────┴──────────────────┘
```

## Mobile

The interface should prioritize:

- Feed
- Search
- Create post
- Notifications
- Profile

The navigation should remain compact and touch-friendly.

---

# 17. Backend API

Current API structure (MVP complete):

```text
/api/auth
    GET    /check-username          Check username availability
    POST   /signup                  Create account, send OTP
    POST   /verify-email            Verify email with OTP
    POST   /resend-otp              Resend OTP (30s throttle)
    POST   /login                   Login, set HTTP-only cookies
    POST   /logout                  Logout, clear cookies
    GET    /me                      Get current user
    POST   /refresh                 Rotate tokens
    POST   /forgot-password         Request password reset OTP
    POST   /reset-password          Reset password with OTP

/api/users
    GET    /                        List users (directory)
    GET    /:username               Get user profile
    PATCH  /me                      Update own profile
    PUT    /me                      Replace own profile
    POST   /:id/follow              Follow user
    DELETE /:id/follow              Unfollow user
    GET    /:id/followers           List followers
    GET    /:id/following           List following
    POST   /:id/block               Block user
    DELETE /:id/block               Unblock user
    GET    /me/blocks               List blocked users
    POST   /me/avatar               Upload avatar (multipart)
    POST   /me/cover                Upload cover image (multipart)
    POST   /me/pin                  Pin a post to profile
    DELETE /me/pin                  Unpin pinned post
    GET    /me/suggestions          Get suggested users
    GET    /me/bookmarks            Get bookmarked posts
    GET    /:username/posts         User's posts
    GET    /:username/replies       User's replies
    GET    /:username/likes         User's liked posts
    GET    /:username/reposts       User's reposts
    GET    /:username/media         User's media posts

/api/posts
    POST   /                        Create post (text + optional image)
    GET    /feed                    Get feed (tab=following/discovery)
    GET    /public                  Public feed (guests)
    GET    /:id                     Get single post
    PATCH  /:id                     Edit own post
    DELETE /:id                     Delete own post
    POST   /:id/like                Like post
    DELETE /:id/like                Unlike post
    POST   /:id/repost              Repost
    DELETE /:id/repost              Remove repost
    POST   /:id/replies             Create reply
    GET    /:id/replies             Get replies
    POST   /:id/bookmark            Bookmark post
    DELETE /:id/bookmark            Remove bookmark

/api/search
    GET    /?q=&type=              Search users (type=users) or posts (type=posts)

/api/notifications
    GET    /                        List notifications (paginated)
    PATCH  /:id/read                Mark single notification read
    PATCH  /read-all                Mark all notifications read
    DELETE /clear-read              Clear read notifications
    DELETE /:id                     Delete notification
    GET    /unread-count            Get unread count

/api/reports
    POST   /                        Report a user or post

/api/hashtags
    GET    /trending                Get trending hashtags
    GET    /:tag/posts              Get posts by hashtag

/api/colleges
    GET    /                        List colleges
    GET    /:slug                   Get college info
    GET    /:slug/members           Get college members
    GET    /:slug/posts             Get college posts

/api/events
    GET    /                        SSE stream for real-time notifications
```

---

# 18. Database Models

Initial MongoDB/Mongoose models:

```text
User
Post
Comment
Like
Follow
Repost
Notification
Report
```

The implementation may embed or reference some relationships depending on performance and query requirements.

Important indexes should be added for:

- Username
- Email
- Post creation time
- Post author
- Follow relationships
- Notification recipient
- Search fields where appropriate

---

# 19. Frontend ↔ Backend Architecture

The frontend and backend are separate applications.

```text
Next.js Frontend
       │
       │ HTTP / JSON
       ▼
Express.js API
       │
       ▼
MongoDB
```

Example:

```text
Browser
  ↓
Next.js
  ↓
fetch("https://api.campuszen...")
  ↓
Express route
  ↓
Controller
  ↓
Service / Model
  ↓
MongoDB
```

The frontend should never directly connect to MongoDB.

All database operations must go through the backend API.

---

# 20. Validation

Zod should be used on the Express backend for incoming data.

Example validation targets:

- Signup
- Login
- Profile updates
- Create post
- Edit post
- Comments
- Search parameters
- Report submissions

Validation should happen before business logic.

---

# 21. Non-Functional Requirements

## Performance

- Paginate feeds.
- Avoid loading unlimited posts.
- Optimize MongoDB queries.
- Lazy-load media when media support is introduced.
- Keep frontend bundles reasonable.

## Security

- HTTP-only authentication cookies
- Secure password hashing
- Input validation
- Authorization checks
- Rate limiting
- CORS configuration
- Security headers
- Protection against common injection attacks
- Consistent error handling
- No sensitive information in API errors

## Reliability

- Centralized error handling
- Database connection handling
- Environment-based configuration
- Server-side logging
- Graceful shutdown

---

# 22. MVP Success Criteria (ALL COMPLETE)

The MVP is considered functional when a new student can:

1. [x] Create an account.
2. [x] Log in.
3. [x] Complete their profile.
4. [x] Find another student.
5. [x] Follow them.
6. [x] See their posts.
7. [x] Create a post.
8. [x] Like a post.
9. [x] Reply to a post.
10. [x] Repost a post.
11. [x] Receive a notification.
12. [x] Search for another student or post.
13. [x] Report or block unwanted content/users.
14. [x] Log out and return later with their session intact.

The complete core social loop must work without manual database intervention.

### Additional Features Completed

- [x] Email verification via OTP
- [x] Password reset flow
- [x] Avatar and cover image uploads
- [x] Bookmarks and pinned posts
- [x] Hashtags with trending
- [x] College system
- [x] User suggestions
- [x] SSE real-time notifications
- [x] Guest access with blur

---

# 23. Explicitly Out of MVP

The following should NOT be required for the first release:

- Direct messages
- Group chats
- Communities
- Voice chat
- Video calls
- Stories
- Clips / short videos
- Events
- Virtual currency
- Marketplace
- Premium subscriptions
- Complex recommendation algorithms
- AI features
- Advanced college verification
- Polls
- Advanced media editing
- Advanced analytics
- Realtime WebSocket notifications

---

# 24. Product Roadmap

> **Roadmap block**
>
> ### MVP — Core Social Network (COMPLETE)
>
> **Goal:** Validate the fundamental student social experience.
>
> - [x] Authentication (signup, login, logout, token refresh)
> - [x] Email verification via OTP (Gmail SMTP)
> - [x] Student profile (avatar, cover, display name, username, bio, college, course, year)
> - [x] Follow / unfollow with follower/following lists
> - [x] Text posts (500 char limit)
> - [x] Home feed with Following + Discovery tabs, cursor pagination
> - [x] Likes / unlike
> - [x] Replies / reply threads
> - [x] Reposts / unrepost
> - [x] User/post search with full-text search
> - [x] In-app notifications (follows, likes, replies, reposts)
> - [x] Block / unblock with mutual hide
> - [x] Report users/posts
> - [x] Bookmarks
> - [x] Pin posts to profile
> - [x] Hashtags with trending and posts-by-hashtag
> - [x] Colleges with members and posts
> - [x] File uploads (avatar, cover) via Appwrite
> - [x] Suggestions for users to follow
> - [x] SSE real-time notifications
> - [x] Responsive desktop/mobile UI (3-column + bottom nav)
> - [x] Secure Express API (helmet, cors, rate limiting, sanitization)
> - [x] MongoDB persistence with proper indexes
> - [x] Password reset flow
> - [x] Guest access with blur for unauthenticated users
>
> ---
>
> ### V1 — Rich Student Social Platform (partially complete)
>
> **Goal:** Make CampusZen useful enough for regular daily student usage.
>
> Already shipped in MVP: image uploads, hashtags, mentions extraction,
> bookmarks, polls, trending hashtags, suggested students, colleges,
> SSE realtime notifications, avatar/cover uploads, pinned posts.
>
> Remaining:
> - Multiple images per post
> - Mentions UI (autocomplete + notifications)
> - Improved feed ranking
> - Student/college verification
> - College information pages (expanded)
> - Better moderation dashboard
> - Profile customization
> - Better notifications
>
> ---
>
> ### V2 — Student Communities
>
> **Goal:** Move from individual social networking to structured student communities.
>
> - Communities
> - College communities
> - Community roles
> - Community moderation
> - Community feeds
> - Community discovery
> - Group discussions
> - Community announcements
> - Resource sharing
> - College-specific discovery
>
> ---
>
> ### V3 — Realtime Campus Platform
>
> **Goal:** Expand CampusZen into a broader student communication platform.
>
> - Direct messages
> - Group chats
> - Realtime messaging
> - Typing indicators
> - Online status
> - Read receipts
> - Voice/video communication
> - Short-form video / Clips
> - Events
> - Event discovery
> - Student creator profiles
> - Advanced notifications
> - More powerful discovery and recommendation systems
>
> ---
>
> ### Future Exploration
>
> Features to consider only after the core product has strong usage:
>
> - Virtual currency
> - Rewards and badges
> - Gamification
> - Student marketplace
> - Premium features
> - Campus-specific services
> - Career networking
> - Internship opportunities
> - AI-powered discovery
> - Mobile applications
> - International student communities

---

# 25. Development Order

Actual implementation sequence (completed):

```text
1. [x] Project setup (Next.js 16, Express, MongoDB, Bun)
   ↓
2. [x] Express server + MongoDB connection with graceful shutdown
   ↓
3. [x] Environment configuration (env validation, multiple services)
   ↓
4. [x] Authentication (JWT, bcrypt, HTTP-only cookies, token rotation)
   ↓
5. [x] Email verification via OTP (Gmail SMTP, 10min expiry, 5 attempts)
   ↓
6. [x] User model + profiles (avatar, cover, college, course, year)
   ↓
7. [x] Next.js frontend foundation (App Router, design tokens, animations)
   ↓
8. [x] Frontend ↔ Express API connection (central api.js, error handling)
   ↓
9. [x] Create/read posts (500 char limit, Zod validation)
   ↓
10. [x] Home feed (Following + Discovery tabs, cursor pagination)
   ↓
11. [x] Likes with toggle and count updates
   ↓
12. [x] Replies with threaded view
   ↓
13. [x] Follow system (follow/unfollow, followers/following lists)
   ↓
14. [x] Reposts with toggle
   ↓
15. [x] Search (users + posts, full-text search)
   ↓
16. [x] Notifications (create, list, mark read, unread count)
   ↓
17. [x] Block/report (mutual hide, auto-unfollow, report queue)
   ↓
18. [x] Bookmarks and pinned posts
   ↓
19. [x] Hashtags (extraction, trending, posts by tag)
   ↓
20. [x] Colleges (CRUD, members, posts)
   ↓
21. [x] File uploads (avatar, cover via Appwrite)
   ↓
22. [x] User suggestions
   ↓
23. [x] SSE real-time notifications
   ↓
24. [x] Security hardening (helmet, cors, rate limiting, sanitization)
   ↓
25. [x] Responsive UI polish (3-column desktop, bottom nav mobile)
   ↓
26. [x] MVP release (September 2026)
```

---

# 26. MVP Definition

CampusZen MVP is **not** a complete replacement for X.

It is a focused experiment to answer one question:

> **Will students use a dedicated social network to discover other students, post content, and interact with each other?**

Everything that does not help answer that question should be considered secondary until the core experience works.

---

# 27. Future Product Direction

CampusZen can eventually evolve from a simple student social network into a broader student platform:

```text
                 CampusZen
                     │
        ┌────────────┼────────────┐
        │            │            │
      Social     Communities   Messaging
        │            │            │
     Posts        Colleges       DMs
     Profiles     Groups         Chats
     Clips        Resources      Calls
        │            │            │
        └────────────┼────────────┘
                     │
                Student Hub
                     │
          Events · Careers ·
          Resources · Rewards
```

The MVP should remain intentionally focused so that these future systems can be built on top of a proven social foundation.
