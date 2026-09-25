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
};
