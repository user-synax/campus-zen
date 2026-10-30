import { Report } from "../models/Report.js";
import { Appeal } from "../models/Appeal.js";
import { VerificationRequest } from "../models/VerificationRequest.js";
import { Post } from "../models/Post.js";
import { User, ACCOUNT_STATUSES } from "../models/User.js";
import { Comment } from "../models/Comment.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { Bookmark } from "../models/Bookmark.js";
import { PollVote } from "../models/PollVote.js";
import { Session } from "../models/Session.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { AdminBroadcast } from "../models/AdminBroadcast.js";
import { AppError } from "../utils/AppError.js";
import { cache, CacheKeys } from "../utils/cache.js";
import { verifyAdminCredentials, isAdminConfigured } from "../middleware/adminAuth.js";
import { sweepExpiredRestrictions } from "../utils/accountState.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_RESTRICT_MINUTES = 5;
const MAX_RESTRICT_MINUTES = 30 * DAY_MS / 60000; // 30 days
const ADMIN_LIST_FIELDS =
  "fullName username email avatarUrl bio college collegeSlug course academicYear socialLinks " +
  "followersCount followingCount postCount isEmailVerified isVerified isPro isOwner achievementTier streakCount " +
  "isSuspended suspendedAt suspendReason accountStatus accountStatusReason accountStatusAt " +
  "restrictedUntil restrictedAt restrictionReason isBanned bannedAt banReason banSetDeactivated " +
  "isDeactivated isPrivate role lastLoginAt createdAt";

// Status as the admin UI should show it: bans win, suspension next, and an
// expired temporary restriction collapses back to good.
function adminStatusOf(user, now = Date.now()) {
  if (!user) return "unknown";
  if (user.isBanned) return "banned";
  if (user.isSuspended) return "suspended";
  if (user.accountStatus === "restricted") {
    if (user.restrictedUntil && new Date(user.restrictedUntil).getTime() > now) return "restricted";
    return "good";
  }
  return user.accountStatus || "good";
}

function decorateAdminUser(user, now = Date.now()) {
  if (!user) return user;
  return {
    ...user,
    displayStatus: adminStatusOf(user, now),
    restrictionActive:
      adminStatusOf(user, now) === "restricted" &&
      Boolean(user.restrictedUntil) &&
      new Date(user.restrictedUntil).getTime() > now,
  };
}

// Ban/unban changes what feeds and profiles should show; drop the surfaces
// that cache author rows or deactivated visibility.
function invalidateUserSurfaces(user) {
  cache.del(CacheKeys.userProfile(user.username));
  cache.delPattern("feed:*");
  cache.delPattern("publicFeed:*");
  cache.delPattern("anonFeed:*");
  cache.delPattern("trending:*");
  cache.delPattern("hashtag:*");
  cache.delPattern("suggestions:*");
  if (user._id) {
    cache.delPattern(`userPosts:${user._id}:*`);
    cache.delPattern(`media:${user._id}:*`);
    cache.delPattern(`replies:${user._id}:*`);
    cache.delPattern(`userLikes:${user._id}:*`);
    cache.delPattern(`userReposts:${user._id}:*`);
    cache.delPattern(`userArticles:${user._id}:*`);
  }
}

function formatAdminDate(date) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return new Date(date).toISOString();
  }
}

function invalidatePostCaches(postId, authorId) {
  cache.del(`post:${postId}`);
  cache.delPattern("feed:*");
  cache.delPattern("publicFeed:*");
  cache.delPattern("anonFeed:*");
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
    await sweepExpiredRestrictions();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const [
      open,
      dismissed,
      actioned,
      totalUsers,
      totalPosts,
      suspended,
      banned,
      restricted,
      verified,
      newToday,
      newWeek,
      activeToday,
      activeWeek,
      appealsOpen,
      appealsTotal,
      verifOpen,
      verifTotal,
      pushSubscribers,
      broadcastsTotal,
      lastBroadcast,
    ] = await Promise.all([
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.countDocuments({ status: "actioned" }),
      User.countDocuments({}),
      Post.countDocuments({}),
      User.countDocuments({ isSuspended: true, isBanned: { $ne: true } }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({
        isBanned: { $ne: true },
        isSuspended: { $ne: true },
        accountStatus: "restricted",
        restrictedUntil: { $gt: now },
      }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ createdAt: { $gte: dayAgo } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ lastLoginAt: { $gte: dayAgo } }),
      User.countDocuments({ lastLoginAt: { $gte: weekAgo } }),
      Appeal.countDocuments({ status: "open" }),
      Appeal.countDocuments({}),
      VerificationRequest.countDocuments({ status: "open" }),
      VerificationRequest.countDocuments({}),
      PushSubscription.countDocuments({}),
      AdminBroadcast.countDocuments({}),
      AdminBroadcast.findOne({}).sort({ createdAt: -1 }).select("title createdAt recipientCount").lean(),
    ]);
    return {
      reports: { open, dismissed, actioned, total: open + dismissed + actioned },
      users: {
        total: totalUsers,
        suspended,
        banned,
        restricted,
        verified,
        newToday,
        newWeek,
        activeToday,
        activeWeek,
      },
      posts: { total: totalPosts },
      appeals: { open: appealsOpen, total: appealsTotal },
      verifications: { open: verifOpen, total: verifTotal },
      push: { subscribers: pushSubscribers },
      broadcasts: { total: broadcastsTotal, lastAt: lastBroadcast?.createdAt || null },
      generatedAt: now,
    };
  },

  async listUsers({ q = "", status = "all", page = 1, limit = 25, sort = "recent" } = {}) {
    await sweepExpiredRestrictions();
    const now = new Date();
    const lim = Math.max(1, Math.min(100, Number(limit) || 25));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const and = [];

    const term = String(q || "").trim().slice(0, 80);
    if (term) {
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      and.push({
        $or: [
          { username: new RegExp(safe, "i") },
          { fullName: new RegExp(safe, "i") },
          { email: new RegExp(safe, "i") },
        ],
      });
    }

    if (status === "restricted") {
      and.push({ isBanned: { $ne: true } }, { isSuspended: { $ne: true } });
      and.push({ accountStatus: "restricted", restrictedUntil: { $gt: now } });
    } else if (status === "suspended") {
      and.push({ isSuspended: true, isBanned: { $ne: true } });
    } else if (status === "banned") {
      and.push({ isBanned: true });
    } else if (status === "verified") {
      and.push({ isVerified: true, isBanned: { $ne: true } });
    } else if (status === "unverified") {
      and.push({ isVerified: { $ne: true }, isBanned: { $ne: true } });
    } else if (status === "deactivated") {
      and.push({ isDeactivated: true, isBanned: { $ne: true } });
    } else if (status === "good") {
      and.push({ isBanned: { $ne: true } }, { isSuspended: { $ne: true } });
      and.push({
        $or: [
          { accountStatus: { $in: ["good", "limited"] } },
          { accountStatus: "restricted", restrictedUntil: { $lte: now } },
          { accountStatus: "restricted", restrictedUntil: null },
        ],
      });
    }

    const filter = and.length ? { $and: and } : {};
    const sortMap = {
      recent: { createdAt: -1 },
      active: { lastLoginAt: -1, createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { fullName: 1 },
      posts: { postCount: -1 },
      followers: { followersCount: -1 },
    };
    const sortBy = sortMap[sort] || sortMap.recent;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(ADMIN_LIST_FIELDS)
        .sort(sortBy)
        .skip(skip)
        .limit(lim)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => decorateAdminUser(u, now.getTime())),
      total,
      page: pg,
      limit: lim,
      hasMore: skip + lim < total,
      sort: sortMap[sort] ? sort : "recent",
      generatedAt: now,
    };
  },

  async getUserDetails(userId) {
    const now = new Date();
    const user = await User.findById(userId).select(ADMIN_LIST_FIELDS).lean();
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const [reportsAgainst, reportsFiled, recentPosts, sessions, appeals, verifications] = await Promise.all([
      Report.countDocuments({ targetType: "user", targetId: userId }),
      Report.countDocuments({ reporter: userId }),
      Post.find({ author: userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .select("text kind isAnonymous createdAt likeCount replyCount repostCount media imageUrl")
        .lean(),
      Session.countDocuments({ user: userId }),
      Appeal.countDocuments({ appellant: userId }),
      VerificationRequest.countDocuments({ user: userId }),
    ]);

    const openReports = await Report.countDocuments({
      targetType: "user",
      targetId: userId,
      status: "open",
    });

    return {
      user: decorateAdminUser(user, now.getTime()),
      counts: {
        reportsAgainst,
        openReports,
        reportsFiled,
        posts: user.postCount || 0,
        followers: user.followersCount || 0,
        following: user.followingCount || 0,
        sessions,
        appeals,
        verifications,
      },
      recentPosts,
    };
  },

  // Temporary read-only restriction. Keeps the user signed in for browsing
  // and notifications; protect() rejects every engagement write until the
  // deadline, and sweepExpiredRestrictions() lifts it automatically.
  async restrictUser(userId, { durationMinutes, reason } = {}) {
    const minutes = Math.round(Number(durationMinutes));
    if (!Number.isFinite(minutes) || minutes < MIN_RESTRICT_MINUTES || minutes > MAX_RESTRICT_MINUTES) {
      throw new AppError(
        `Duration must be between ${MIN_RESTRICT_MINUTES} minutes and 30 days`,
        400,
        "INVALID_RESTRICTION_DURATION"
      );
    }
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isOwner) throw new AppError("The owner account cannot be restricted.", 403, "OWNER_PROTECTED");
    if (user.isBanned) throw new AppError("Unban the account before restricting it.", 409, "USER_BANNED");

    const now = new Date();
    const until = new Date(now.getTime() + minutes * 60 * 1000);
    const clean = reason ? String(reason).slice(0, 500) : null;
    user.accountStatus = "restricted";
    user.accountStatusReason = clean;
    user.accountStatusAt = now;
    user.restrictedUntil = until;
    user.restrictedAt = now;
    user.restrictionReason = clean;
    // A restriction replaces an advisory suspension; the ban flags stay off.
    if (user.isSuspended) {
      user.isSuspended = false;
      user.suspendedAt = null;
      user.suspendReason = null;
    }
    await user.save();
    invalidateUserSurfaces(user);

    try {
      const { notificationService } = await import("./notificationService.js");
      await notificationService.createAdminNotice({
        recipient: user._id,
        title: "Your account has been temporarily restricted",
        body:
          `${clean ? `Reason: ${clean}. ` : ""}` +
          `You can still browse CampusZen, but posting, replying, liking, following and bookmarking are paused until ${formatAdminDate(until)}. This lifts automatically.`,
      });
    } catch {}

    return decorateAdminUser(user.toSafeObject(), now.getTime());
  },

  async unrestrictUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isBanned) throw new AppError("Unban the account first.", 409, "USER_BANNED");

    user.accountStatus = "good";
    user.accountStatusReason = null;
    user.accountStatusAt = new Date();
    user.restrictedUntil = null;
    user.restrictedAt = null;
    user.restrictionReason = null;
    await user.save();
    invalidateUserSurfaces(user);

    try {
      const { notificationService } = await import("./notificationService.js");
      await notificationService.createAdminNotice({
        recipient: user._id,
        title: "Your account restriction has been lifted",
        body: "You can post and interact on CampusZen again. Thanks for your patience.",
      });
    } catch {}

    return decorateAdminUser(user.toSafeObject());
  },

  // Permanent ban: revoke every session, block login/refresh, hide profile and
  // posts by flipping isDeactivated (the flag every read surface already
  // respects), and remember whether we did so for a clean unban.
  async banUser(userId, reason) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isOwner) throw new AppError("The owner account cannot be banned.", 403, "OWNER_PROTECTED");
    if (user.isBanned) return decorateAdminUser(user.toSafeObject());

    const now = new Date();
    const clean = reason ? String(reason).slice(0, 500) : null;
    user.isBanned = true;
    user.bannedAt = now;
    user.banReason = clean;
    user.accountStatus = "banned";
    user.accountStatusReason = clean;
    user.accountStatusAt = now;
    user.restrictedUntil = null;
    user.restrictedAt = null;
    user.restrictionReason = null;
    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendReason = null;
    if (!user.isDeactivated) {
      user.isDeactivated = true;
      user.banSetDeactivated = true;
    }
    user.refreshTokenHash = null;
    await user.save();

    const { sessionService } = await import("./sessionService.js");
    await sessionService.revokeAll(user._id);
    await Report.updateMany(
      { targetType: "user", targetId: userId, status: "open" },
      { $set: { status: "actioned" } }
    );
    invalidateUserSurfaces(user);
    return decorateAdminUser(user.toSafeObject(), now.getTime());
  },

  async unbanUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (!user.isBanned) return decorateAdminUser(user.toSafeObject());

    user.isBanned = false;
    user.bannedAt = null;
    user.banReason = null;
    // A ban clears any restriction it replaced; make sure unban leaves no
    // stale deadline behind either.
    user.restrictedUntil = null;
    user.restrictedAt = null;
    user.restrictionReason = null;
    if (user.banSetDeactivated) {
      user.isDeactivated = false;
      user.banSetDeactivated = false;
    }
    if (user.accountStatus === "banned") {
      user.accountStatus = "good";
      user.accountStatusReason = null;
      user.accountStatusAt = new Date();
    }
    await user.save();
    invalidateUserSurfaces(user);

    try {
      const { notificationService } = await import("./notificationService.js");
      await notificationService.createAdminNotice({
        recipient: user._id,
        title: "Your account has been reinstated",
        body: "The ban on your account has been lifted. You can sign in and use CampusZen again.",
      });
    } catch {}

    return decorateAdminUser(user.toSafeObject());
  },

  async sendBroadcast({ title, body, audience = "all", userIds = [] }, adminEmail) {
    const cleanTitle = String(title || "").trim().slice(0, 120);
    const cleanBody = String(body || "").trim().slice(0, 1000);
    if (!cleanTitle || !cleanBody) {
      throw new AppError("A title and message are required.", 400, "INVALID_BROADCAST");
    }
    if (!["all", "selected"].includes(audience)) {
      throw new AppError("Audience must be all or selected.", 400, "INVALID_AUDIENCE");
    }

    let recipients;
    if (audience === "selected") {
      const ids = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
      if (!ids.length) {
        throw new AppError("Pick at least one recipient.", 400, "NO_RECIPIENTS");
      }
      recipients = await User.find({
        _id: { $in: ids },
        isBanned: { $ne: true },
        isDeactivated: { $ne: true },
        isEmailVerified: true,
      })
        .select("_id")
        .lean();
      if (!recipients.length) {
        throw new AppError("None of the selected users can receive messages.", 400, "NO_RECIPIENTS");
      }
    } else {
      recipients = await User.find({
        isBanned: { $ne: true },
        isDeactivated: { $ne: true },
        isEmailVerified: true,
      })
        .select("_id")
        .lean();
      if (!recipients.length) {
        throw new AppError("There are no active users to message yet.", 400, "NO_RECIPIENTS");
      }
    }

    const ids = recipients.map((u) => u._id);
    const pushSubscriberCount = await PushSubscription.countDocuments({ user: { $in: ids } });
    const broadcast = await AdminBroadcast.create({
      title: cleanTitle,
      body: cleanBody,
      audience,
      userIds: audience === "selected" ? ids : [],
      recipientCount: ids.length,
      recipientSample: ids.slice(0, 5),
      pushSubscriberCount,
      createdBy: adminEmail || null,
    });

    const { notificationService } = await import("./notificationService.js");
    const result = await notificationService.createAdminMessages({
      recipients: ids,
      title: cleanTitle,
      body: cleanBody,
      type: "admin_broadcast",
      broadcastId: broadcast._id,
    });

    broadcast.recipientCount = result.created;
    await broadcast.save();

    return {
      broadcast: {
        ...broadcast.toObject(),
        recipientCount: result.created,
        pushSubscriberCount,
      },
      recipientCount: result.created,
      pushSubscriberCount,
    };
  },

  async listBroadcasts({ page = 1, limit = 20 } = {}) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const [broadcasts, total] = await Promise.all([
      AdminBroadcast.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("recipientSample", "fullName username avatarUrl")
        .lean(),
      AdminBroadcast.countDocuments({}),
    ]);
    return { broadcasts, total, page: pg, limit: lim, hasMore: skip + lim < total };
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
              .populate("author", "fullName username avatarUrl isSuspended isBanned")
              .lean();
            return { ...r, target: post || null, targetMissing: !post };
          }
          const user = await User.findById(r.targetId)
            .select(
              "fullName username avatarUrl bio college isSuspended suspendedAt accountStatus accountStatusReason accountStatusAt restrictedUntil restrictionReason isBanned bannedAt banReason createdAt"
            )
            .lean();
          return { ...r, target: user ? decorateAdminUser(user) : null, targetMissing: !user };
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
    const wasAnon = Boolean(post.isAnonymous);
    await Post.deleteOne({ _id: postId });
    await Promise.all([
      wasAnon ? Promise.resolve() : User.findByIdAndUpdate(authorId, { $inc: { postCount: -1 } }),
      User.updateOne({ _id: authorId, pinnedPost: postId }, { $unset: { pinnedPost: 1 } }),
      Comment.deleteMany({ post: postId }),
      Like.deleteMany({ post: postId }),
      Repost.deleteMany({ post: postId }),
      Bookmark.deleteMany({ post: postId }),
      PollVote.deleteMany({ post: postId }),
      (await import("../models/PostView.js")).PostView.deleteMany({ post: postId }),
      Report.updateMany({ targetType: "post", targetId: postId, status: "open" }, { $set: { status: "actioned" } }),
    ]);
    if (!wasAnon) await User.updateOne({ _id: authorId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
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
    if (user.isBanned) throw new AppError("Unban the account before suspending it.", 409, "USER_BANNED");
    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspendReason = reason ? String(reason).slice(0, 500) : null;
    user.accountStatus = "suspended";
    user.accountStatusReason = user.suspendReason;
    user.accountStatusAt = new Date();
    user.restrictedUntil = null;
    user.restrictedAt = null;
    user.restrictionReason = null;
    user.refreshTokenHash = null; // force logout everywhere
    await user.save();
    invalidateUserSurfaces(user);
    await Report.updateMany({ targetType: "user", targetId: userId, status: "open" }, { $set: { status: "actioned" } });
    return decorateAdminUser(user.toSafeObject());
  },

  async unsuspendUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendReason = null;
    // Only the suspended standing is cleared — a limited/restricted review
    // still stands until an admin lifts it separately.
    if (user.accountStatus === "suspended") {
      user.accountStatus = "good";
      user.accountStatusReason = null;
      user.accountStatusAt = new Date();
    }
    await user.save();
    invalidateUserSurfaces(user);
    return decorateAdminUser(user.toSafeObject());
  },

  // Account standing as the owner sees it on /menu. Dedicated endpoints exist
  // for restrict and ban; this remains the generic escape hatch (and keeps the
  // existing reports UI working) while syncing every enforcement flag.
  async setAccountStatus(userId, status, reason) {
    if (!ACCOUNT_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${ACCOUNT_STATUSES.join(", ")}`, 400, "INVALID_STATUS");
    }
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isOwner && (status === "banned" || status === "suspended")) {
      throw new AppError("The owner account cannot be banned or suspended.", 403, "OWNER_PROTECTED");
    }
    const now = new Date();
    const clean = reason ? String(reason).slice(0, 500) : null;
    user.accountStatus = status;
    user.accountStatusReason = status === "good" ? null : clean;
    user.accountStatusAt = now;

    if (status === "suspended") {
      if (!user.isSuspended) user.suspendedAt = now;
      user.isSuspended = true;
      user.suspendReason = clean;
      user.refreshTokenHash = null; // force logout everywhere
      user.restrictedUntil = null;
      user.restrictedAt = null;
      user.restrictionReason = null;
    } else if (status === "restricted") {
      user.isSuspended = false;
      user.suspendedAt = null;
      user.suspendReason = null;
      // A bare "restricted" call still has to expire; default to 24h.
      if (!user.restrictedUntil || user.restrictedUntil <= now) {
        user.restrictedUntil = new Date(now.getTime() + DAY_MS);
      }
      user.restrictedAt = now;
      user.restrictionReason = clean;
    } else if (status === "banned") {
      const { sessionService } = await import("./sessionService.js");
      user.isBanned = true;
      user.bannedAt = now;
      user.banReason = clean;
      if (!user.isDeactivated) {
        user.isDeactivated = true;
        user.banSetDeactivated = true;
      }
      user.isSuspended = false;
      user.suspendedAt = null;
      user.suspendReason = null;
      user.restrictedUntil = null;
      user.restrictedAt = null;
      user.restrictionReason = null;
      user.refreshTokenHash = null;
      await user.save();
      await sessionService.revokeAll(user._id);
      invalidateUserSurfaces(user);
      await Report.updateMany(
        { targetType: "user", targetId: userId, status: "open" },
        { $set: { status: "actioned" } },
      );
      return decorateAdminUser(user.toSafeObject());
    } else {
      if (user.isSuspended) {
        user.isSuspended = false;
        user.suspendedAt = null;
        user.suspendReason = null;
      }
      if (user.isBanned) {
        user.isBanned = false;
        user.bannedAt = null;
        user.banReason = null;
        if (user.banSetDeactivated) {
          user.isDeactivated = false;
          user.banSetDeactivated = false;
        }
      }
      user.restrictedUntil = null;
      user.restrictedAt = null;
      user.restrictionReason = null;
    }
    await user.save();
    invalidateUserSurfaces(user);
    // Same side effect as suspendUser: suspending settles the open reports
    // on that account so they do not sit in the queue forever.
    if (status === "suspended") {
      await Report.updateMany(
        { targetType: "user", targetId: userId, status: "open" },
        { $set: { status: "actioned" } },
      );
    }
    return decorateAdminUser(user.toSafeObject());
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

  // Manual Pro grant until billing exists. Revoking does not erase the saved
  // cosmetics: the render path gates them on isPro, so they return if the
  // account is upgraded again.
  async setUserPro(userId, isPro) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isPro = Boolean(isPro);
    await user.save();
    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern("feed:*");
    return user.toSafeObject();
  },
};
