# TODO — CampusZen Backend

## Skipped for now

- [x] **Block user (PRD §15)** — Done 2026-09-26: `Block` model + `blockService` (mutual hide, auto-unfollow both ways, notif suppression), enforced in follow/feed/search/profile/lists/notifications. `POST/DELETE /api/users/:id/block`, `GET /api/users/me/blocks`.
- [x] **Report (PRD §15)** — Done 2026-09-26: `Report` model + `POST /api/reports` (reason enum, one report per reporter+target, status=open queue for future admin). Frontend hides reported posts instantly via local store.

- [x] **Email delivery (PRD §7, §21)** — Done 2026-09-26 via Gmail SMTP + nodemailer (`utils/email.js`).
  - OTP emails (verify/reset) + welcome email, fail-closed sends, no dev console/debug leaks.
  - Replace with `nodemailer` + provider (Resend / SendGrid / SMTP).
  - Template: verification vs reset, 6-digit, 10m expiry, brand colors `#ffcead` on `#0c122c`.
  - Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM=noreply@campuszen.app`.
  - Remove debug endpoint and console log before production.
  - Consider queue (BullMQ / email service) to keep `/signup`, `/forgot-password` fast (<120ms) under load.

## Notes

- Frontend already handles `gmail.com / proton.me` allowlist; backend re-validates via Zod in `services/authService.js` — keep in sync if list expands.
- OTP stored hashed (`bcrypt 10`) in separate `Otp` collection with TTL index on `expiresAt` and `attempts` cap 5 — purging strategy is automatic.

## When resuming

1. `bun add nodemailer`
2. Implement `src/utils/email.js` with `sendOtpEmail({to, type, otp})`
3. Update `src/services/authService.js` to `await sendOtpEmail(...)` instead of `logOtp`
4. Remove `src/routes/authRoutes.js` debug route guard `if (NODE_ENV !== 'production')`
5. Test with Mailtrap in dev, then switch to prod provider and set `COOKIE_SECURE=true`, `FRONTEND_URL=https://...`
