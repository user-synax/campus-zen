import { Report } from "../models/Report.js";
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
    const [open, dismissed, actioned, totalUsers, totalPosts, suspended] = await Promise.all([
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.countDocuments({ status: "actioned" }),
      User.countDocuments({}),
      Post.countDocuments({}),
      User.countDocuments({ isSuspended: true }),
    ]);
    return { reports: { open, dismissed, actioned, total: open + dismissed + actioned }, users: { total: totalUsers, suspended }, posts: { total: totalPosts } };
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
      Report.updateMany({ targetType: "post", targetId: postId, status: "open" }, { $set: { status: "actioned" } }),
    ]);
    await User.updateOne({ _id: authorId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
    invalidatePostCaches(postId, authorId);
    if (post.imageUrl) {
      try {
        const { deleteFromAppwrite } = await import("../config/appwrite.js");
        const fileId = post.imageUrl.match(/\/files\/([^/]+)\//)?.[1];
        if (fileId) await deleteFromAppwrite(fileId);
      } catch {}
    }
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
};
