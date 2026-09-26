import { Report, REPORT_REASONS } from "../models/Report.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export { REPORT_REASONS };

export const reportService = {
  async file({ reporterId, targetType, targetId, reason, details }) {
    if (targetType === "user" && String(reporterId) === String(targetId)) {
      throw new AppError("You cannot report yourself", 400, "SELF_REPORT");
    }
    const Target = targetType === "post" ? Post : User;
    const target = await Target.findById(targetId).select("_id author");
    if (!target) throw new AppError(`${targetType === "post" ? "Post" : "User"} not found`, 404, "REPORT_TARGET_NOT_FOUND");
    // reporting your own post is pointless — reject quietly as duplicate-like
    if (targetType === "post" && target.author && String(target.author) === String(reporterId)) {
      throw new AppError("You cannot report your own post", 400, "SELF_REPORT");
    }

    try {
      const report = await Report.create({ reporter: reporterId, targetType, targetId, reason, details: details || null });
      return { id: report._id, status: report.status };
    } catch (err) {
      if (err.code === 11000) throw new AppError("You already reported this", 409, "ALREADY_REPORTED");
      throw err;
    }
  },
};
