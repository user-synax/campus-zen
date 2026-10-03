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

router.post("/me/avatar", avatarLimiter, protect, avatarUpload.single("avatar"), userController.updateAvatar);
router.post("/me/cover", avatarLimiter, protect, avatarUpload.single("cover"), userController.updateCover);

// pin — before /:username to avoid param clash
const pinSchema = z.object({ postId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post id") });
router.post("/me/pin", meLimiter, protect, validate(pinSchema), userController.pinPost);
router.delete("/me/pin", meLimiter, protect, userController.unpinPost);

// follow — before /:username to avoid param clash
router.post("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.follow);
router.delete("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.unfollow);
router.get("/:id/followers", meLimiter, optionalAuth, validate(idParam, "params"), followController.getFollowers);
router.get("/:id/following", meLimiter, optionalAuth, validate(idParam, "params"), followController.getFollowing);

// follow requests — approval queue for private accounts
const requestIdParam = z.object({ requestId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
router.get("/me/follow-requests/incoming", protect, followController.incoming);
router.get("/me/follow-requests/outgoing", protect, followController.outgoing);
router.post("/me/follow-requests/:requestId/accept", protect, validate(requestIdParam, "params"), followController.accept);
router.post("/me/follow-requests/:requestId/decline", protect, validate(requestIdParam, "params"), followController.decline);

// privacy + data controls — before /:username to avoid param clash
router.patch("/me/privacy", meLimiter, protect, validate(privacySchema), userController.updatePrivacy);
router.get("/me/export", protect, userController.exportMe);
router.post("/me/deactivate", protect, userController.deactivateMe);
router.post("/me/reactivate", protect, userController.reactivateMe);
router.delete("/me", protect, validate(deleteMeSchema), userController.deleteMe);

// block — before /:username to avoid param clash
router.get("/me/blocks", protect, blockController.list);
router.get("/me/bookmarks", protect, userController.myBookmarks);

const suggestionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});
router.get("/me/suggestions", meLimiter, protect, validate(suggestionsQuery, "query"), userController.suggestions);
router.post("/:id/block", blockLimiter, protect, validate(idParam, "params"), blockController.block);
router.delete("/:id/block", blockLimiter, protect, validate(idParam, "params"), blockController.unblock);

// profile tab lists — single via username, before generic :username
router.get("/:username/posts", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getUserPosts);
router.get("/:username/replies", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getUserReplies);
router.get("/:username/likes", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getUserLikes);
router.get("/:username/reposts", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getUserReposts);
router.get("/:username/media", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getUserMedia);

// list users — public, optional auth to decide guest blur
router.get("/", meLimiter, optionalAuth, userController.listUsers);

router.get("/:username", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getByUsername);
router.patch("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

// also allow PATCH /me with PUT alias
router.put("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

export default router;
