import { blockService } from "../services/blockService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const blockController = {
  block: asyncHandler(async (req, res) => {
    await blockService.block(req.user._id, req.params.id);
    res.status(201).json({ success: true, message: "User blocked", data: { blocked: true } });
  }),

  unblock: asyncHandler(async (req, res) => {
    await blockService.unblock(req.user._id, req.params.id);
    res.json({ success: true, message: "User unblocked", data: { blocked: false } });
  }),

  list: asyncHandler(async (req, res) => {
    const users = await blockService.listBlocked(req.user._id);
    res.json({ success: true, data: { users } });
  }),
};
