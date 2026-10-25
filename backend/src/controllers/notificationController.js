import { notificationService } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Every write response uses the same envelope: `message` at the top level and
// any other payload under `data` — never spread onto the response root.
function respond(res, result) {
  const { message, ...data } = result || {};
  const body = { success: true, ...(message ? { message } : {}) };
  if (Object.keys(data).length) body.data = data;
  res.json(body);
}

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, filter, type } = req.query;
    const result = await notificationService.list(req.user._id, { page, limit, filter, type });
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
    respond(res, result);
  }),

  deleteOne: asyncHandler(async (req, res) => {
    const result = await notificationService.deleteOne(req.user._id, req.params.id);
    respond(res, result);
  }),

  clearRead: asyncHandler(async (req, res) => {
    const result = await notificationService.clearRead(req.user._id);
    respond(res, result);
  }),
};
