import { Report } from "../models/Report.js";
import { Appeal } from "../models/Appeal.js";
import { VerificationRequest } from "../models/VerificationRequest.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { Comment } from "../models/Comment.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { Bookmark } from "../models/Bookmark.js";
import { PollVote } from "../models/PollVote.js";
import { AppError } from "../utils/AppError.js";
import { cache } from "../utils/cache.js";
import { verifyAdminCredentials, isAdminConfigured } from "../middleware/adminAuth.js";

function invalidatePostCaches(postId, authorId) {
  cache.del(`post:${postId}`);
  cache.delPattern("feed:*");
  cache.delPattern("publicFeed:*");
  cache.delPattern("trending:*");
  cache.delPattern("hashtag:*");
  if (authorId) {
    cache.delPattern(`userPosts:${authorId}:*`);
    cache.delPattern(`media:${authorId}:*`);
  }
}

export const adminService = {
  async login({ email, passkey }) {
    if (!isAdminConfigured()) {
      throw new AppError("Admin dashboard is not configured. Set ADMIN_EMAIL + ADMIN_PASSKEY on backend.", 503, "ADMIN_NOT_CONFIGURED");
    }
    const ok = verifyAdminCredentials(email, passkey);
    if (!ok) throw new AppError("Invalid admin credentials.", 401, "ADMIN_INVALID_CREDENTIALS");
    return { email: String(email).toLowerCase().trim() };
  },

  async stats() {
    const [open, dismissed, actioned, totalUsers, totalPosts, suspended, appealsOpen, appealsTotal, verifOpen, verifTotal, verifiedCount] = await Promise.all([
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.countDocuments({ status: "actioned" }),
      User.countDocuments({}),
      Post.countDocuments({}),
      User.countDocuments({ isSuspended: true }),
      Appeal.countDocuments({ status: "open" }),
      Appeal.countDocuments({}),
      VerificationRequest.countDocuments({ status: "open" }),
      VerificationRequest.countDocuments({}),
      User.countDocuments({ isVerified: true }),
    ]);
    return { reports: { open, dismissed, actioned, total: open + dismissed + actioned }, users: { total: totalUsers, suspended, verified: verifiedCount }, posts: { total: totalPosts }, appeals: { open: appealsOpen, total: appealsTotal }, verifications: { open: verifOpen, total: verifTotal } };
  },

  async listReports({ status = "open", page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = status === "all" ? {} : { status };
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("reporter", "fullName username avatarUrl")
        .lean(),
      Report.countDocuments(filter),
    ]);

    // attach target preview: post (with author) or user
    const withTargets = await Promise.all(
      reports.map(async (r) => {
        try {
          if (r.targetType === "post") {
            const post = await Post.findById(r.targetId)
              .populate("author", "fullName username avatarUrl isSuspended")
              .lean();
            return { ...r, target: post || null, targetMissing: !post };
          }
          const user = await User.findById(r.targetId)
            .select("fullName username avatarUrl bio college isSuspended createdAt")
            .lean();
          return { ...r, target: user || null, targetMissing: !user };
        } catch {
          return { ...r, target: null, targetMissing: true };
        }
      }),
    );

    return { reports: withTargets, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async resolveReport(reportId, status) {
    if (!["dismissed", "actioned"].includes(status)) {
      throw new AppError("Status must be dismissed or actioned", 400, "INVALID_STATUS");
    }
    const report = await Report.findByIdAndUpdate(reportId, { $set: { status } }, { new: true });
    if (!report) throw new AppError("Report not found", 404, "REPORT_NOT_FOUND");
    // Feedback to the reporter (best-effort, never blocks admin).
    try {
      const { notificationService } = await import("./notificationService.js");
      const { Notification } = await import("../models/Notification.js");
      // System-style notification: actor = reporter self is skipped by create(),
      // so insert directly with a moderation type.
      await Notification.create({ recipient: report.reporter, actor: report.reporter, type: "report_update", post: report.targetType === "post" ? report.targetId : null });
    } catch {}
    return report;
  },

  // Admin override delete — no ownership check. Cleans relations,
  // decrements author counter, marks sibling open reports actioned.
  async deletePost(postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    const authorId = post.author;
    await Post.deleteOne({ _id: postId });
    await Promise.all([
      User.findByIdAndUpdate(authorId, { $inc: { postCount: -1 } }),
      User.updateOne({ _id: authorId, pinnedPost: postId }, { $unset: { pinnedPost: 1 } }),
      Comment.deleteMany({ post: postId }),
      Like.deleteMany({ post: postId }),
      Repost.deleteMany({ post: postId }),
      Bookmark.deleteMany({ post: postId }),
      PollVote.deleteMany({ post: postId }),
      (await import("../models/PostView.js")).PostView.deleteMany({ post: postId }),
      Report.updateMany({ targetType: "post", targetId: postId, status: "open" }, { $set: { status: "actioned" } }),
    ]);
    await User.updateOne({ _id: authorId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
    invalidatePostCaches(postId, authorId);
    try {
      const { deleteFromAppwrite, extractFileId } = await import("../config/appwrite.js");
      const targets = [];
      for (const m of post.media || []) {
        if (m.fileId) targets.push(m.fileId);
        else if (m.url) {
          const id = extractFileId(m.url);
          if (id) targets.push(id);
        }
        if (m.posterFileId) targets.push(m.posterFileId);
        else if (m.posterUrl) {
          const id = extractFileId(m.posterUrl);
          if (id) targets.push(id);
        }
      }
      if (post.imageUrl) {
        const id = extractFileId(post.imageUrl);
        if (id && !targets.includes(id)) targets.push(id);
      }
      for (const id of targets) await deleteFromAppwrite(id);
    } catch {}
    return { message: "Post deleted by admin" };
  },

  async suspendUser(userId, reason) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspendReason = reason ? String(reason).slice(0, 500) : null;
    user.refreshTokenHash = null; // force logout everywhere
    await user.save();
    await Report.updateMany({ targetType: "user", targetId: userId, status: "open" }, { $set: { status: "actioned" } });
    return user.toSafeObject();
  },

  async unsuspendUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendReason = null;
    await user.save();
    return user.toSafeObject();
  },

  async listAppeals({ status = "open", page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = status === "all" ? {} : { status };
    const [appeals, total] = await Promise.all([
      Appeal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("appellant", "fullName username avatarUrl isSuspended")
        .populate("report", "targetType reason status targetId")
        .lean(),
      Appeal.countDocuments(filter),
    ]);
    return { appeals, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async reviewAppeal(appealId, { status, reviewNote }) {
    if (!["upheld", "rejected"].includes(status)) {
      throw new AppError("Status must be upheld or rejected", 400, "INVALID_STATUS");
    }
    const appeal = await Appeal.findById(appealId);
    if (!appeal) throw new AppError("Appeal not found", 404, "APPEAL_NOT_FOUND");
    appeal.status = status;
    appeal.reviewNote = reviewNote ? String(reviewNote).slice(0, 1000) : null;
    appeal.reviewedAt = new Date();
    await appeal.save();
    // Upheld report-appeal reopens the report for a second look.
    if (status === "upheld" && appeal.report) {
      await Report.findByIdAndUpdate(appeal.report, { $set: { status: "open" } });
    }
    try {
      const { Notification } = await import("../models/Notification.js");
      await Notification.create({ recipient: appeal.appellant, actor: appeal.appellant, type: "appeal_update" });
    } catch {}
    return appeal;
  },

  async listVerifications({ status = "open", page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = status === "all" ? {} : { status };
    const [requests, total] = await Promise.all([
      VerificationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("user", "fullName username avatarUrl bio college postCount followersCount followingCount isVerified createdAt")
        .lean(),
      VerificationRequest.countDocuments(filter),
    ]);
    // refresh live counts so admin sees current sufficiency, not just snapshot
    const withLive = await Promise.all(
      requests.map(async (r) => {
        try {
          if (!r.user?._id) return { ...r, live: null };
          const live = await User.findById(r.user._id).select("postCount followersCount isVerified").lean();
          return { ...r, live };
        } catch {
          return { ...r, live: null };
        }
      })
    );
    return { requests: withLive, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async reviewVerification(requestId, { status, reviewNote }) {
    if (!["approved", "rejected"].includes(status)) {
      throw new AppError("Status must be approved or rejected", 400, "INVALID_STATUS");
    }
    const req = await VerificationRequest.findById(requestId);
    if (!req) throw new AppError("Verification request not found", 404, "VERIFICATION_NOT_FOUND");
    req.status = status;
    req.reviewNote = reviewNote ? String(reviewNote).slice(0, 1000) : null;
    req.reviewedAt = new Date();
    await req.save();
    if (status === "approved") {
      await User.findByIdAndUpdate(req.user, { $set: { isVerified: true } });
    }
    try {
      const { Notification } = await import("../models/Notification.js");
      await Notification.create({ recipient: req.user, actor: req.user, type: "appeal_update" });
    } catch {}
    return req;
  },

  async setUserVerified(userId, isVerified) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isVerified = Boolean(isVerified);
    await user.save();
    return user.toSafeObject();
  },
};
