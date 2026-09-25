import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { userController } from "../controllers/userController.js";
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
});

const meLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:username", meLimiter, protect, validate(usernameParam, "params"), userController.getByUsername);
router.patch("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

// also allow PATCH /me with PUT alias
router.put("/me", meLimiter, protect, validate(updateMeSchema), userController.updateMe);

export default router;
