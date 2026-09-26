import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { hashtagController } from "../controllers/hashtagController.js";
import rateLimit from "express-rate-limit";

const router = Router();

const tagParam = z.object({
  tag: z.string().trim().min(1, "Tag required").max(32).regex(/^[#\p{L}\p{M}\p{N}_]+$/u, "Invalid hashtag"),
});

const postsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const trendingQuery = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional().default(10),
});

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// trending must be declared before :tag route
router.get("/trending", limiter, validate(trendingQuery, "query"), hashtagController.trending);
router.get("/:tag/posts", optionalAuth, limiter, validate(tagParam, "params"), validate(postsQuery, "query"), hashtagController.postsByTag);

export default router;
