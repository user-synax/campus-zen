import { reportService } from "../services/reportService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reportController = {
  file: asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, details } = req.body;
    const result = await reportService.file({ reporterId: req.user._id, targetType, targetId, reason, details });
    res.status(201).json({ success: true, message: "Report submitted. Thanks for keeping CampusZen safe.", data: result });
  }),

  mine: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await reportService.myReports(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  appeal: asyncHandler(async (req, res) => {
    const { type, subjectId, message } = req.body;
    const result = await reportService.appeal({ appellantId: req.user._id, reportId: req.params.id, type: type || "report", subjectId, message });
    res.status(201).json({ success: true, message: "Appeal submitted. We'll review and notify you.", data: result });
  }),

  appealGeneral: asyncHandler(async (req, res) => {
    const { type, subjectId, message, reportId } = req.body;
    const result = await reportService.appeal({ appellantId: req.user._id, reportId: reportId || null, type, subjectId, message });
    res.status(201).json({ success: true, message: "Appeal submitted. We'll review and notify you.", data: result });
  }),

  myAppeals: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await reportService.myAppeals(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),
};
