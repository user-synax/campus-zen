import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { adminController } from "../controllers/adminController.js";
import { adminLoginLimiter } from "../middleware/rateLimiter.js";
import { REPORT_STATUSES } from "../models/Report.js";
import { ACCOUNT_STATUSES } from "../models/User.js";

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

const accountStatusSchema = z.object({
  status: z.enum(ACCOUNT_STATUSES),
  reason: z.string().trim().max(500).optional(),
});

const appealQuerySchema = z.object({
  status: z.enum(["open", "upheld", "rejected", "all"]).optional().default("open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const reviewAppealSchema = z.object({
  status: z.enum(["upheld", "rejected"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

const verificationQuerySchema = z.object({
  status: z.enum(["open", "approved", "rejected", "all"]).optional().default("open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const reviewVerificationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

const setVerifiedSchema = z.object({
  isVerified: z.boolean(),
});

const usersQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  status: z
    .enum(["all", "good", "restricted", "suspended", "banned", "verified", "unverified", "deactivated"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  sort: z.enum(["recent", "active", "oldest", "name", "posts", "followers"]).optional().default("recent"),
});

const restrictSchema = z.object({
  durationMinutes: z.coerce.number().int().min(5).max(43200),
  reason: z.string().trim().max(500).optional(),
});

const banSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const broadcastSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Message is required").max(1000),
  audience: z.enum(["all", "selected"]).optional().default("all"),
  userIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id")).max(500).optional().default([]),
});

const broadcastQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
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
router.get("/users", requireAdmin, validate(usersQuerySchema, "query"), adminController.listUsers);
router.get("/users/:id", requireAdmin, validate(idParamSchema, "params"), adminController.getUser);
router.post(
  "/users/:id/restrict",
  requireAdmin,
  validate(idParamSchema, "params"),
  validate(restrictSchema),
  adminController.restrictUser
);
router.post("/users/:id/unrestrict", requireAdmin, validate(idParamSchema, "params"), adminController.unrestrictUser);
router.post("/users/:id/ban", requireAdmin, validate(idParamSchema, "params"), validate(banSchema), adminController.banUser);
router.post("/users/:id/unban", requireAdmin, validate(idParamSchema, "params"), adminController.unbanUser);
router.get("/broadcasts", requireAdmin, validate(broadcastQuerySchema, "query"), adminController.listBroadcasts);
router.post("/broadcasts", requireAdmin, validate(broadcastSchema), adminController.sendBroadcast);
router.get("/reports", requireAdmin, validate(reportsQuerySchema, "query"), adminController.listReports);
router.patch("/reports/:id", requireAdmin, validate(idParamSchema, "params"), validate(resolveSchema), adminController.resolveReport);
router.get("/appeals", requireAdmin, validate(appealQuerySchema, "query"), adminController.listAppeals);
router.patch("/appeals/:id", requireAdmin, validate(idParamSchema, "params"), validate(reviewAppealSchema), adminController.reviewAppeal);
router.delete("/posts/:id", requireAdmin, validate(idParamSchema, "params"), adminController.deletePost);
router.patch("/users/:id/suspend", requireAdmin, validate(idParamSchema, "params"), validate(suspendSchema), adminController.suspendUser);
router.patch("/users/:id/unsuspend", requireAdmin, validate(idParamSchema, "params"), adminController.unsuspendUser);
router.patch("/users/:id/status", requireAdmin, validate(idParamSchema, "params"), validate(accountStatusSchema), adminController.setAccountStatus);
router.get("/verifications", requireAdmin, validate(verificationQuerySchema, "query"), adminController.listVerifications);
router.patch("/verifications/:id", requireAdmin, validate(idParamSchema, "params"), validate(reviewVerificationSchema), adminController.reviewVerification);
router.patch("/users/:id/verified", requireAdmin, validate(idParamSchema, "params"), validate(setVerifiedSchema), adminController.setUserVerified);

export default router;
