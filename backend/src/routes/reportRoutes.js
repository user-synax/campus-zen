import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { reportController } from "../controllers/reportController.js";
import { reportLimiter } from "../middleware/rateLimiter.js";
import { REPORT_REASONS } from "../models/Report.js";

const router = Router();

const fileSchema = z.object({
  targetType: z.enum(["post", "user"]),
  targetId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

router.post("/", reportLimiter, protect, validate(fileSchema), reportController.file);

export default router;
