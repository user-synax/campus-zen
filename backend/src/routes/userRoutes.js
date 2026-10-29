import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { userController } from "../controllers/userController.js";
import { followController } from "../controllers/followController.js";
import { blockController } from "../controllers/blockController.js";
import { avatarUpload } from "../middleware/upload.js";
import rateLimit from "express-rate-limit";

const router = Router();

const usernameParam = z.object({ username: z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/) });

const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(160).nullable().optional(),
  college: z.string().trim().max(100).nullable().optional(),
  course: z.string().trim().max(100).nullable().optional(),
  academicYear: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduated"]).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  coverUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  accent: z.enum(["peach", "lavender", "mint", "sky", "rose"]).nullable().optional(),
  isPrivate: z.boolean().optional(),
  showSensitive: z.boolean().optional(),
  replyPolicy: z.enum(["everyone", "followers", "none"]).optional(),
  mentionPolicy: z.enum(["everyone", "followers", "none"]).optional(),
  profileVisibility: z.object({
    college: z.enum(["public", "followers", "hidden"]).optional(),
    course: z.enum(["public", "followers", "hidden"]).optional(),
    academicYear: z.enum(["public", "followers", "hidden"]).optional(),
  }).optional(),
  socialLinks: z
    .object({
      github: z
        .string()
        .trim()
        .max(39)
        .regex(/^[a-zA-Z0-9-]{1,39}$/, "Invalid GitHub username")
        .nullable()
        .optional()
        .or(z.literal("").transform(() => null)),
      twitter: z.string().trim().max(30).nullable().optional().or(z.literal("").transform(() => null)),
      linkedin: z.string().trim().max(100).nullable().optional().or(z.literal("").transform(() => null)),
      instagram: z.string().trim().max(30).nullable().optional().or(z.literal("").transform(() => null)),
    })
    .optional(),
});

const privacySchema = z.object({
  isPrivate: z.boolean().optional(),
  showSensitive: z.boolean().optional(),
  replyPolicy: z.enum(["everyone", "followers", "none"]).optional(),
  mentionPolicy: z.enum(["everyone", "followers", "none"]).optional(),
  profileVisibility: z.object({
    college: z.enum(["public", "followers", "hidden"]).optional(),
    course: z.enum(["public", "followers", "hidden"]).optional(),
    academicYear: z.enum(["public", "followers", "hidden"]).optional(),
  }).optional(),
});

const deleteMeSchema = z.object({
  confirm: z.string().optional(),
});

// DELETE carries its confirmation in the query string so the request needs no
// body; the body form is still accepted for older clients.
const deleteMeQuery = z.object({
  confirm: z.string().trim().max(40).optional(),
});

const meLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const followLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const blockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });

// Shared collection query contract: page >= 1, 1..50 per page, everything else
// stripped. Every list route below validates with one of these so a bad page or
// limit returns 400 instead of reaching the service (and .skip(NaN)).
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const profileListQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  kind: z.enum(["post", "article"]).optional(),
});

const listUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  college: z.string().trim().max(100).optional(),
  course: z.string().trim().max(100).optional(),
  academicYear: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

router.post("/me/avatar", avatarLimiter, protect, avatarUpload.single("avatar"), userController.updateAvatar);
router.post("/me/cover", avatarLimiter, protect, avatarUpload.single("cover"), userController.updateCover);

// pin — before /:username to avoid param clash
const pinSchema = z.object({ postId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post id") });
router.post("/me/pin", meLimiter, protect, validate(pinSchema), userController.pinPost);
router.delete("/me/pin", meLimiter, protect, userController.unpinPost);

// follow — before /:username to avoid param clash
router.post("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.follow);
router.delete("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.unfollow);
router.get("/:id/followers", meLimiter, optionalAuth, validate(idParam, "params"), validate(pageQuery, "query"), followController.getFollowers);
router.get("/:id/following", meLimiter, optionalAuth, validate(idParam, "params"), validate(pageQuery, "query"), followController.getFollowing);

// follow requests — approval queue for private accounts
const requestIdParam = z.object({ requestId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
router.get("/me/follow-requests/incoming", protect, validate(pageQuery, "query"), followController.incoming);
router.get("/me/follow-requests/outgoing", protect, validate(pageQuery, "query"), followController.outgoing);
router.post("/me/follow-requests/:requestId/accept", protect, validate(requestIdParam, "params"), followController.accept);
router.post("/me/follow-requests/:requestId/decline", protect, validate(requestIdParam, "params"), followController.decline);

// privacy + data controls — before /:username to avoid param clash
router.patch("/me/privacy", meLimiter, protect, validate(privacySchema), userController.updatePrivacy);
// DOB is one-shot + immutable — dedicated endpoint, strict limiter.
const dobSchema = z.object({
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  guardianName: z.string().trim().min(2).max(80).optional(),
  guardianEmail: z.string().email().max(254).optional(),
});
const consentSchema = z.object({
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept the Terms and Privacy Notice" }),
  analytics: z.boolean().optional(),
});
const withdrawConsentSchema = z.object({
  core: z.boolean().optional().default(true),
});
const guardianResendSchema = z.object({
  guardianName: z.string().trim().min(2).max(80).optional(),
  guardianEmail: z.string().email().max(254).optional(),
});
const dobLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post("/me/dob", dobLimiter, protect, validate(dobSchema), userController.setDobOnce);
router.post("/me/consent", meLimiter, protect, validate(consentSchema), userController.recordConsent);
router.post("/me/consent/withdraw", meLimiter, protect, validate(withdrawConsentSchema), userController.withdrawConsent);
router.post("/me/guardian-consent/resend", meLimiter, protect, validate(guardianResendSchema), userController.resendGuardianConsent);
router.get("/me/export", protect, userController.exportMe);
router.post("/me/deactivate", protect, userController.deactivateMe);
router.post("/me/reactivate", protect, userController.reactivateMe);
router.delete("/me", protect, validate(deleteMeQuery, "query"), validate(deleteMeSchema), userController.deleteMe);

// block — before /:username to avoid param clash
router.get("/me/blocks", protect, blockController.list);
router.get("/me/bookmarks", protect, validate(pageQuery, "query"), userController.myBookmarks);

const suggestionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});
router.get("/me/suggestions", meLimiter, protect, validate(suggestionsQuery, "query"), userController.suggestions);
router.get("/me/achievements", meLimiter, protect, userController.getMyAchievements);
router.post("/:id/block", blockLimiter, protect, validate(idParam, "params"), blockController.block);
router.delete("/:id/block", blockLimiter, protect, validate(idParam, "params"), blockController.unblock);

// profile tab lists — single via username, before generic :username
router.get("/:username/posts", meLimiter, optionalAuth, validate(usernameParam, "params"), validate(profileListQuery, "query"), userController.getUserPosts);
router.get("/:username/replies", meLimiter, optionalAuth, validate(usernameParam, "params"), validate(pageQuery, "query"), userController.getUserReplies);
router.get("/:username/likes", meLimiter, optionalAuth, validate(usernameParam, "params"), validate(pageQuery, "query"), userController.getUserLikes);
router.get("/:username/reposts", meLimiter, optionalAuth, validate(usernameParam, "params"), validate(pageQuery, "query"), userController.getUserReposts);
router.get("/:username/media", meLimiter, optionalAuth, validate(usernameParam, "params"), validate(pageQuery, "query"), userController.getUserMedia);

// list users — public, optional auth to decide guest blur
router.get("/", meLimiter, optionalAuth, validate(listUsersQuery, "query"), userController.listUsers);

router.get("/:username", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getByUsername);
router.patch("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

export default router;
