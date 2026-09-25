import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { searchController } from "../controllers/searchController.js";
import rateLimit from "express-rate-limit";

const router = Router();

const querySchema = z.object({
  q: z.string().trim().min(1, "Search query required").max(100),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: z.enum(["all", "users", "posts"]).optional().default("all"),
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/", optionalAuth, limiter, validate(querySchema, "query"), searchController.search);

export default router;
