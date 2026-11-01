import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalize(origin) {
  return String(origin || "")
    .trim()
    .replace(/\/+$/, "");
}

function allowedOrigins() {
  // FRONTEND_URL is the admin dashboard's own origin. Extra hosts (www/apex,
  // a staging domain) can be appended through ADMIN_ALLOWED_ORIGINS.
  const extra = String(process.env.ADMIN_ALLOWED_ORIGINS || "").split(",");
  return new Set([env.FRONTEND_URL, ...extra].map(normalize).filter(Boolean));
}

/**
 * Cookie-authenticated admin routes are state-changing (ban, restore, delete)
 * and carry no CSRF token, so a cross-site HTML form could otherwise execute
 * them while an admin is signed in. CORS does not prevent the request from
 * being sent — it only hides the response — so the Origin has to be checked
 * here.
 *
 * Requests without an Origin header (curl, server-to-server, health checks)
 * carry no ambient browser cookie and stay allowed.
 */
export function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(String(req.method || "").toUpperCase())) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (allowedOrigins().has(normalize(origin))) return next();
  return res.status(403).json({
    success: false,
    code: "UNTRUSTED_ORIGIN",
    message: "Cross-origin admin request blocked.",
  });
}
