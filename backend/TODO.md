# TODO — CampusZen Backend

## Completed (MVP)

- [x] **Block user (PRD §15)** — Done 2026-09-26: `Block` model + `blockService` (mutual hide, auto-unfollow both ways, notif suppression), enforced in follow/feed/search/profile/lists/notifications. `POST/DELETE /api/users/:id/block`, `GET /api/users/me/blocks`.
- [x] **Report (PRD §15)** — Done 2026-09-26: `Report` model + `POST /api/reports` (reason enum, one report per reporter+target, status=open queue for future admin). Frontend hides reported posts instantly via local store.
- [x] **Email delivery (PRD §7, §21)** — Done 2026-09-26 via Gmail SMTP + nodemailer (`utils/email.js`).
  - OTP emails (verify/reset) + welcome email, fail-closed sends, no dev console/debug leaks.
  - Template: verification vs reset, 6-digit, 10m expiry, brand colors `#ffcead` on `#0c122c`.
  - Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM=noreply@campuszen.app`.
- [x] **Avatar upload** — Done: Multer + Appwrite storage, 5MB limit, jpg/png/webp.
- [x] **Hashtags** — Done: `hashtagRoutes`, `hashtagService` with trending and posts-by-hashtag.
- [x] **Bookmarks** — Done: `Bookmark` model, bookmark/unbookmark endpoints, user bookmarks list.
- [x] **Pinning** — Done: Pin/unpin posts to profile, `pinPost`/`unpinPost` in api.js.
- [x] **Suggestions** — Done: `GET /api/users/me/suggestions` for follow suggestions.
- [x] **College system** — Done: `College` model, college routes, members, college posts.
- [x] **SSE events** — Done: Server-Sent Events at `/api/events` for real-time notifications.
- [x] **Cover images** — Done: Upload cover image endpoint, `uploadCover` in api.js.

## Known Issues / Future Improvements

- [ ] Consider queue (BullMQ / email service) to keep `/signup`, `/forgot-password` fast (<120ms) under load.
- [x] Admin dashboard for reports management — Done: env-gated `ADMIN_EMAIL + ADMIN_PASSKEY` (`/api/admin/*` + `/admin` page), reports list/resolve, delete post, suspend/unsuspend user.
- [ ] Add rate limiting for SSE connections.
- [ ] Add pagination to suggestions endpoint.

## Notes

- Frontend already handles `gmail.com / proton.me` allowlist; backend re-validates via Zod in `services/authService.js` — keep in sync if list expands.
- OTP stored hashed (`bcrypt 10`) in separate `Otp` collection with TTL index on `expiresAt` and `attempts` cap 5 — purging strategy is automatic.
- All routes now include: auth, users, posts, hashtags, search, notifications, events (SSE), reports, colleges.
- Frontend has 22 app components, 9 landing components, 4 auth components, 6 UI primitives.
