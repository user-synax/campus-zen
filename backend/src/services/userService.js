import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const userService = {
  async getByUsername(username) {
    const clean = username.toLowerCase().trim();
    const user = await User.findOne({ username: clean });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },

  async updateMe(userId, data) {
    const allowed = ["fullName", "bio", "college", "course", "academicYear", "avatarUrl"];
    const update = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

    // normalize empty string -> null for optional fields
    for (const k of ["bio", "college", "course", "academicYear", "avatarUrl"]) {
      if (update[k] === "") update[k] = null;
    }

    if (update.fullName !== undefined) {
      const v = String(update.fullName).trim();
      if (v.length < 2) throw new AppError("Full name must be at least 2 characters", 400, "VALIDATION_ERROR");
      if (v.length > 50) throw new AppError("Full name too long", 400, "VALIDATION_ERROR");
      update.fullName = v;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },
};
