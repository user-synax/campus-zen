import { z } from "zod";
import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { verificationService } from "../services/verificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const requestSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const data = await verificationService.getMyStatus(req.user._id);
    res.json({ success: true, data });
  })
);

router.post(
  "/request",
  protect,
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    const data = await verificationService.requestVerification(req.user._id, req.body?.message);
    res.status(201).json({ success: true, message: "Verification request submitted.", data });
  })
);

export default router;
