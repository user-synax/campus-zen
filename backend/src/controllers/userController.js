import { userService } from "../services/userService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userController = {
  getByUsername: asyncHandler(async (req, res) => {
    const user = await userService.getByUsername(req.params.username);
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
