import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { pushController } from "../controllers/pushController.js";

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(10).max(500),
  }),
  device: z
    .object({
      userAgent: z.string().max(500).optional(),
      platform: z.string().max(100).optional(),
    })
    .optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public key is safe to expose — needed before subscribe.
router.get("/public-key", pushController.publicKey);

router.use(protect);
router.post("/subscribe", limiter, validate(subscribeSchema, "body"), pushController.subscribe);
router.delete("/unsubscribe", limiter, validate(unsubscribeSchema, "body"), pushController.unsubscribe);
router.get("/subscriptions", limiter, pushController.list);

export default router;
