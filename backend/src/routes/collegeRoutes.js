import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { collegeController } from "../controllers/collegeController.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
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

// order matters: "/" before "/:slug"
router.get("/", limiter, optionalAuth, validate(listQuery, "query"), collegeController.search);
router.get("/:slug", limiter, optionalAuth, validate(slugParam, "params"), collegeController.getBySlug);
router.get("/:slug/members", limiter, optionalAuth, validate(slugParam, "params"), collegeController.listMembers);
router.get("/:slug/posts", limiter, optionalAuth, validate(slugParam, "params"), collegeController.listPosts);

export default router;
