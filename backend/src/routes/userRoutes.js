import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { userController } from "../controllers/userController.js";
import { followController } from "../controllers/followController.js";
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

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });

router.post("/me/avatar", avatarLimiter, protect, avatarUpload.single("avatar"), userController.updateAvatar);

// follow — before /:username to avoid param clash
router.post("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.follow);
router.delete("/:id/follow", followLimiter, protect, validate(idParam, "params"), followController.unfollow);
router.get("/:id/followers", meLimiter, optionalAuth, validate(idParam, "params"), followController.getFollowers);
router.get("/:id/following", meLimiter, optionalAuth, validate(idParam, "params"), followController.getFollowing);

// list users — public, optional auth to decide guest blur
router.get("/", meLimiter, optionalAuth, userController.listUsers);

router.get("/:username", meLimiter, optionalAuth, validate(usernameParam, "params"), userController.getByUsername);
router.patch("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

// also allow PATCH /me with PUT alias
router.put("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

export default router;
