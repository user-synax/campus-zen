import { reportService } from "../services/reportService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reportController = {
  file: asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, details } = req.body;
    const result = await reportService.file({ reporterId: req.user._id, targetType, targetId, reason, details });
    res.status(201).json({ success: true, message: "Report submitted. Thanks for keeping CampusZen safe.", data: result });
  }),
};
