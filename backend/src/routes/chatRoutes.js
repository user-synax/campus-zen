import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { chatController } from "../controllers/chatController.js";

const router = Router();
const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
const messageParam = z.object({ messageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
const pagination = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
});
const createSchema = z.object({ participantId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid participant id") });
const messageSchema = z.object({ text: z.string().trim().min(1).max(2000) });
const typingSchema = z.object({ isTyping: z.boolean() });
const participantSearchQuery = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(protect);
router.get("/participants", limiter, validate(participantSearchQuery, "query"), chatController.searchParticipants);
router.get("/", limiter, validate(pagination, "query"), chatController.list);
router.post("/", limiter, validate(createSchema), chatController.create);
router.get("/:id/messages", limiter, validate(idParam, "params"), validate(pagination, "query"), chatController.messages);
router.post("/:id/messages", limiter, validate(idParam, "params"), validate(messageSchema), chatController.send);
router.patch("/:id/read", limiter, validate(idParam, "params"), chatController.read);
router.post("/:id/typing", limiter, validate(idParam, "params"), validate(typingSchema), chatController.typing);
router.delete("/messages/:messageId", limiter, validate(messageParam, "params"), chatController.deleteMessage);

export default router;
