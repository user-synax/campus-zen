import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { notificationController } from "../controllers/notificationController.js";
import rateLimit from "express-rate-limit";

const router = Router();

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  filter: z.enum(["all", "unread"]).optional().default("all"),
  // "all" is the no-filter case the client sends explicitly, so it has to be
  // in the enum alongside the specific types.
  type: z
    .enum(["all", "follow", "like", "reply", "repost", "mention", "follow_request", "follow_accept", "report_update", "appeal_update"])
    .optional(),
});

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

router.use(protect);

router.get("/", limiter, validate(paginationQuery, "query"), notificationController.list);
router.get("/unread-count", limiter, notificationController.unreadCount);
router.patch("/:id/read", limiter, validate(idParam, "params"), notificationController.markRead);
router.patch("/read-all", limiter, notificationController.markAllRead);
router.delete("/clear-read", limiter, notificationController.clearRead);
router.delete("/:id", limiter, validate(idParam, "params"), notificationController.deleteOne);

export default router;
