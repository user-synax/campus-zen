import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { adminController } from "../controllers/adminController.js";
import { adminLoginLimiter } from "../middleware/rateLimiter.js";
import { REPORT_STATUSES } from "../models/Report.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid admin email"),
  passkey: z.string().min(8, "Invalid passkey"),
});

const reportsQuerySchema = z.object({
  status: z.enum([...REPORT_STATUSES, "all"]).optional().default("open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const resolveSchema = z.object({
  status: z.enum(["dismissed", "actioned"]),
});

const suspendSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
});

// public (but strictly rate-limited) — env credentials only
router.post("/login", adminLoginLimiter, validate(loginSchema), adminController.login);
router.post("/logout", adminController.logout);

// everything below requires the adminToken cookie
router.get("/me", requireAdmin, adminController.me);
router.get("/stats", requireAdmin, adminController.stats);
router.get("/reports", requireAdmin, validate(reportsQuerySchema, "query"), adminController.listReports);
router.patch("/reports/:id", requireAdmin, validate(idParamSchema, "params"), validate(resolveSchema), adminController.resolveReport);
router.delete("/posts/:id", requireAdmin, validate(idParamSchema, "params"), adminController.deletePost);
router.patch("/users/:id/suspend", requireAdmin, validate(idParamSchema, "params"), validate(suspendSchema), adminController.suspendUser);
router.patch("/users/:id/unsuspend", requireAdmin, validate(idParamSchema, "params"), adminController.unsuspendUser);

export default router;
