import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { reportController } from "../controllers/reportController.js";
import { reportLimiter } from "../middleware/rateLimiter.js";
import { REPORT_REASONS } from "../models/Report.js";
import { APPEAL_TYPES } from "../models/Appeal.js";

const router = Router();

const fileSchema = z.object({
  targetType: z.enum(["post", "user"]),
  targetId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

const appealSchema = z.object({
  type: z.enum(APPEAL_TYPES).optional().default("report"),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id").optional(),
  message: z.string().trim().min(1).max(1000),
});

const appealGeneralSchema = z.object({
  type: z.enum(APPEAL_TYPES),
  reportId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id").optional(),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id").optional(),
  message: z.string().trim().min(1).max(1000),
});

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });

router.post("/", reportLimiter, protect, validate(fileSchema), reportController.file);
router.get("/me", protect, reportController.mine);
router.get("/appeals/me", protect, reportController.myAppeals);
router.post("/appeals", reportLimiter, protect, validate(appealGeneralSchema), reportController.appealGeneral);
router.post("/:id/appeal", reportLimiter, protect, validate(idParam, "params"), validate(appealSchema), reportController.appeal);

export default router;
