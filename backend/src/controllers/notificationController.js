import { notificationService } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, filter } = req.query;
    const result = await notificationService.list(req.user._id, { page, limit, filter });
    res.json({ success: true, data: result });
  }),

  unreadCount: asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, data: result });
  }),

  markRead: asyncHandler(async (req, res) => {
    const notif = await notificationService.markRead(req.user._id, req.params.id);
    res.json({ success: true, data: { notification: notif } });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user._id);
    res.json({ success: true, ...result });
  }),
};
