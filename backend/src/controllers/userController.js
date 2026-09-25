import { userService } from "../services/userService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userController = {
  listUsers: asyncHandler(async (req, res) => {
    const { q, college, course, academicYear, page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await userService.listUsers({ q, college, course, academicYear, page, limit, viewerId });
    const isGuest = !req.user;
    res.json({ success: true, data: { ...result, isGuest } });
  }),

  getByUsername: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const user = await userService.getByUsername(req.params.username, viewerId);
    res.json({ success: true, data: { user } });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateMe(req.user._id, req.body);
    res.json({ success: true, message: "Profile updated", data: { user } });
  }),

  updateAvatar: asyncHandler(async (req, res) => {
    if (!req.file) throw new (await import("../utils/AppError.js")).AppError("No avatar file provided", 400, "NO_FILE");
    const user = await userService.updateAvatar(req.user._id, req.file);
    res.json({ success: true, message: "Avatar updated", data: { user } });
  }),
};
