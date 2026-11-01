import { Report, REPORT_REASONS } from "../models/Report.js";
import { Appeal } from "../models/Appeal.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { notificationService } from "./notificationService.js";
import { cache, CacheKeys } from "../utils/cache.js";

export { REPORT_REASONS };

// Moderation thresholds. A report alleging sexual content quarantines the post
// on the first report; every other reason needs three independent reports.
const AUTO_HIDE_REPORTS_SEXUAL = 1;
const AUTO_HIDE_REPORTS_ANY = 3;

function invalidatePostVisibility(postId, authorId) {
  cache.del(CacheKeys.post(postId));
  cache.delPattern("feed:*");
  cache.delPattern("publicFeed:*");
  cache.delPattern("anonFeed:*");
  cache.delPattern("orderPublic:*");
  cache.delPattern("publicLatest:*");
  cache.delPattern("feedLatest:*");
  cache.delPattern("hashtag:*");
  cache.delPattern("articles:*");
  cache.delPattern("comments:*");
  cache.delPattern("bookmarks:*");
  if (authorId) {
    cache.delPattern(`userPosts:${authorId}:*`);
    cache.delPattern(`userArticles:${authorId}:*`);
    cache.delPattern(`media:${authorId}:*`);
    cache.delPattern(`userLikes:${authorId}:*`);
    cache.delPattern(`userReposts:${authorId}:*`);
  }
}

/**
 * Quarantine a reported post once its open-report count crosses the threshold
 * for the reason given. Idempotent and race-safe: the conditional update only
 * matches a post that is still visible, so parallel reports can't double-fire.
 */
async function quarantineIfNeeded(targetId, reason) {
  const post = await Post.findById(targetId).select("author isHidden").lean();
  if (!post || post.isHidden) return false;
  const openReports = await Report.countDocuments({ targetType: "post", targetId, status: "open" });
  const shouldHide =
    reason === "sexual"
      ? openReports >= AUTO_HIDE_REPORTS_SEXUAL
      : openReports >= AUTO_HIDE_REPORTS_ANY;
  if (!shouldHide) return false;

  const result = await Post.updateOne(
    { _id: targetId, isHidden: { $ne: true } },
    {
      $set: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenBy: "auto_report",
        hiddenReason: `Auto-hidden after ${openReports} open report(s); latest reason: ${reason}`,
      },
    },
  );
  if (!result.modifiedCount) return false;
  invalidatePostVisibility(targetId, post.author);
  return true;
}

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
      // Reporting is the only moderation trigger the app has: quarantine the
      // post as soon as the threshold is crossed so reported content leaves
      // feeds/search immediately instead of waiting for an admin to look.
      const hidden = targetType === "post" ? await quarantineIfNeeded(targetId, reason) : false;
      return { id: report._id, status: report.status, hidden };
    } catch (err) {
      if (err.code === 11000) throw new AppError("You already reported this", 409, "ALREADY_REPORTED");
      throw err;
    }
  },

  // User-facing report status: my reports with target preview + appeal state.
  async myReports(reporterId, { page = 1, limit = 20 } = {}) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = { reporter: reporterId };
    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Report.countDocuments(filter),
    ]);
    const withTargets = await Promise.all(
      reports.map(async (r) => {
        let target = null;
        let appeal = null;
        try {
          if (r.targetType === "post") {
            target = await Post.findById(r.targetId)
              .select("text author createdAt")
              .populate("author", "username fullName")
              .lean();
          } else {
            target = await User.findById(r.targetId).select("username fullName avatarUrl isSuspended").lean();
          }
          appeal = await Appeal.findOne({ report: r._id, appellant: reporterId }).sort({ createdAt: -1 }).lean();
        } catch {}
        return { ...r, target, appeal };
      }),
    );
    return { reports: withTargets, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  // File an appeal against a report decision / suspension / post removal.
  async appeal({ appellantId, reportId, type, subjectId, message }) {
    const msg = String(message || "").trim();
    if (!msg || msg.length > 1000) throw new AppError("Appeal message must be 1-1000 characters", 400, "VALIDATION_ERROR");
    if (!["report", "suspension", "post_removal"].includes(type)) {
      throw new AppError("Invalid appeal type", 400, "VALIDATION_ERROR");
    }
    let report = null;
    if (reportId) {
      report = await Report.findById(reportId);
      if (!report) throw new AppError("Report not found", 404, "REPORT_NOT_FOUND");
      // Only the reporter can appeal their own report's outcome.
      if (type === "report" && String(report.reporter) !== String(appellantId)) {
        throw new AppError("You can only appeal your own reports", 403, "FORBIDDEN");
      }
      if (report.status === "open") {
        throw new AppError("Report is still under review. You can appeal after a decision.", 400, "REPORT_OPEN");
      }
      const existing = await Appeal.findOne({ report: reportId, appellant: appellantId, status: "open" });
      if (existing) throw new AppError("You already have an open appeal for this report", 409, "APPEAL_EXISTS");
    } else {
      // Suspension / post_removal appeals without a report link: one open at a time.
      const existing = await Appeal.findOne({ appellant: appellantId, type, status: "open", subjectId: subjectId || null });
      if (existing) throw new AppError("You already have an open appeal", 409, "APPEAL_EXISTS");
    }
    const appeal = await Appeal.create({
      appellant: appellantId,
      type,
      report: reportId || null,
      subjectId: subjectId || report?.targetId || null,
      message: msg,
    });
    return { id: appeal._id, status: appeal.status };
  },

  async myAppeals(appellantId, { page = 1, limit = 20 } = {}) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const [appeals, total] = await Promise.all([
      Appeal.find({ appellant: appellantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("report", "targetType reason status")
        .lean(),
      Appeal.countDocuments({ appellant: appellantId }),
    ]);
    return { appeals, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },
};
