# CampusZen — Product Requirements Document

**Product:** CampusZen  
**Type:** Student-focused social media web application  
**Inspiration:** X-style social networking, adapted for college students  
**Status:** MVP planning  
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

Initial API structure:

```text
/api/auth
    POST   /signup
    POST   /login
    POST   /logout
    GET    /me
    POST   /forgot-password
    POST   /reset-password
    POST   /verify-email

/api/users
    GET    /:username
    PATCH  /me
    POST   /:id/follow
    DELETE /:id/follow
    GET    /:id/followers
    GET    /:id/following

/api/posts
    POST   /
    GET    /feed
    GET    /public
    GET    /:id
    PATCH  /:id
    DELETE /:id

/api/posts/:id
    POST   /like
    DELETE /like
    POST   /repost
    DELETE /repost
    POST   /replies

/api/search
    GET    /?q=

/api/notifications
    GET    /
    PATCH  /:id/read

/api/reports
    POST   /
```

The exact route structure can evolve during implementation.

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

# 22. MVP Success Criteria

The MVP is considered functional when a new student can:

1. Create an account.
2. Log in.
3. Complete their profile.
4. Find another student.
5. Follow them.
6. See their posts.
7. Create a post.
8. Like a post.
9. Reply to a post.
10. Repost a post.
11. Receive a notification.
12. Search for another student or post.
13. Report or block unwanted content/users.
14. Log out and return later with their session intact.

The complete core social loop must work without manual database intervention.

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
> ### MVP — Core Social Network
>
> **Goal:** Validate the fundamental student social experience.
>
> - Authentication
> - Email verification
> - Student profile
> - Follow / unfollow
> - Text posts
> - Home feed
> - Likes
> - Replies
> - Reposts
> - User/post search
> - Notifications
> - Block
> - Report
> - Basic admin moderation
> - Responsive desktop/mobile UI
> - Secure Express API
> - MongoDB persistence
>
> ---
>
> ### V1 — Rich Student Social Platform
>
> **Goal:** Make CampusZen useful enough for regular daily student usage.
>
> - Image uploads
> - Multiple images per post
> - Hashtags
> - Mentions
> - Bookmarks
> - Polls
> - Trending posts
> - Suggested students
> - Improved feed ranking
> - Student/college verification
> - College information pages
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

Recommended implementation sequence:

```text
1. Project setup
   ↓
2. Express server + MongoDB
   ↓
3. Environment configuration
   ↓
4. Authentication
   ↓
5. User model + profiles
   ↓
6. Next.js frontend foundation
   ↓
7. Frontend ↔ Express API connection
   ↓
8. Create/read posts
   ↓
9. Home feed
   ↓
10. Likes
   ↓
11. Replies
   ↓
12. Follow system
   ↓
13. Reposts
   ↓
14. Search
   ↓
15. Notifications
   ↓
16. Block/report
   ↓
17. Basic admin moderation
   ↓
18. Security hardening
   ↓
19. Responsive UI polish
   ↓
20. MVP release
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
