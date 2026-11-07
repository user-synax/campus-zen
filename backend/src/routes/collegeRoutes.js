import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { requireOwner, requireCollegeCap } from "../middleware/collegeAuth.js";
import { collegeController } from "../controllers/collegeController.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// moderation actions are rare but destructive — tighter than reads
const modLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const slugParam = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9-]+$/),
});

const listQuery = z.object({
  q: z.string().trim().max(100).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const userIdParam = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9-]+$/),
  userId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/),
});

const postIdParam = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9-]+$/),
  postId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/),
});

const addAdminBody = z.object({
  username: z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/),
});

const capsBody = z.object({
  kick: z.boolean().optional(),
  ban: z.boolean().optional(),
  moderatePosts: z.boolean().optional(),
});

// order matters: "/" before "/:slug"
router.get("/", limiter, optionalAuth, validate(listQuery, "query"), collegeController.search);
router.get("/:slug", limiter, optionalAuth, validate(slugParam, "params"), collegeController.getBySlug);
router.get("/:slug/members", limiter, optionalAuth, validate(slugParam, "params"), validate(pageQuery, "query"), collegeController.listMembers);
router.get("/:slug/posts", limiter, optionalAuth, validate(slugParam, "params"), validate(pageQuery, "query"), collegeController.listPosts);

// ── College moderation ────────────────────────────────────────────────────
// Owner manages the team (assign, switch caps, remove); delegated admins
// exercise kick/ban/delete strictly inside their college. /admin console is
// untouched — this is the in-app, per-college layer.

// which tools should the page render for the viewer
router.get(
  "/:slug/my-caps",
  limiter,
  optionalAuth,
  validate(slugParam, "params"),
  collegeController.myCaps,
);

// live presence snapshot for the active-now strip
router.get(
  "/:slug/active-now",
  limiter,
  optionalAuth,
  validate(slugParam, "params"),
  collegeController.activeNow,
);

// self-service Join/Leave — members manage their own membership from the page
router.post(
  "/:slug/claim",
  modLimiter,
  protect,
  validate(slugParam, "params"),
  collegeController.claim,
);

router.delete(
  "/:slug/claim",
  modLimiter,
  protect,
  validate(slugParam, "params"),
  collegeController.unclaim,
);

// owner console for this college's team
router.get(
  "/:slug/admins",
  modLimiter,
  protect,
  validate(slugParam, "params"),
  requireOwner,
  collegeController.listAdmins,
);

router.post(
  "/:slug/admins",
  modLimiter,
  protect,
  validate(slugParam, "params"),
  validate(addAdminBody, "body"),
  requireOwner,
  collegeController.addAdmin,
);

router.patch(
  "/:slug/admins/:userId",
  modLimiter,
  protect,
  validate(userIdParam, "params"),
  validate(capsBody, "body"),
  requireOwner,
  collegeController.updateAdminCaps,
);

router.delete(
  "/:slug/admins/:userId",
  modLimiter,
  protect,
  validate(userIdParam, "params"),
  requireOwner,
  collegeController.removeAdmin,
);

// member actions
router.delete(
  "/:slug/members/:userId",
  modLimiter,
  protect,
  validate(userIdParam, "params"),
  requireCollegeCap("kick"),
  collegeController.kickMember,
);

router.post(
  "/:slug/members/:userId/ban",
  modLimiter,
  protect,
  validate(userIdParam, "params"),
  requireCollegeCap("ban"),
  collegeController.banMember,
);

router.delete(
  "/:slug/members/:userId/ban",
  modLimiter,
  protect,
  validate(userIdParam, "params"),
  requireCollegeCap("ban"),
  collegeController.unbanMember,
);

// post moderation (cap: moderatePosts)
router.delete(
  "/:slug/posts/:postId",
  modLimiter,
  protect,
  validate(postIdParam, "params"),
  requireCollegeCap("moderatePosts"),
  collegeController.moderatePost,
);

export default router;
