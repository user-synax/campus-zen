import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { blockService } from "./blockService.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";

export const userService = {
  async listUsers({ q, college, course, academicYear, page = 1, limit = 20, viewerId }) {
    const filter = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc, "i");
      filter.$or = [{ username: re }, { fullName: re }, { bio: re }];
    }
    if (college) filter.college = new RegExp(`^${college.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (course) filter.course = new RegExp(`^${course.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (academicYear) filter.academicYear = academicYear;
    // mutual hide: exclude blocked users for logged-in viewers
    if (viewerId) {
      const hidden = await blockService.blockedIdsFor(viewerId);
      if (hidden.length) filter._id = { $nin: hidden };
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Math.min(50, Number(limit)));
    const lim = Math.max(1, Math.min(50, Number(limit)));

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter),
    ]);

    let followingSet = new Set();
    if (viewerId && users.length) {
      const ids = users.map((u) => u._id);
      const { Follow } = await import("../models/Follow.js");
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }

    const safe = users.map((u) => {
      const { passwordHash, refreshTokenHash, __v, ...rest } = u;
      return { ...rest, isFollowing: followingSet.has(String(u._id)) };
    });

    return {
      users: safe,
      total,
      page: Number(page),
      limit: lim,
      hasMore: skip + lim < total,
    };
  },

  // Ranked "Suggested students" for the discovery rail (PRD §12, V1).
  // Affinity order: same college > mutual follows > same course > same year.
  // Tiebreak prefers newer accounts so fresh faces stay discoverable.
  async suggestions(viewerId, { limit = 6 } = {}) {
    const lim = Math.max(1, Math.min(20, Number(limit) || 6));
    const cacheKey = CacheKeys.suggestions(viewerId);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const { Follow } = await import("../models/Follow.js");

    const viewer = await User.findById(viewerId).select("college course academicYear").lean();
    if (!viewer) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const [myFollowing, hidden] = await Promise.all([
      Follow.find({ follower: viewerId }).select("following").lean(),
      blockService.blockedIdsFor(viewerId),
    ]);
    const myFollowingIds = myFollowing.map((f) => f.following);
    const excluded = [viewerId, ...myFollowingIds, ...hidden];

    // oversample recent users, then rank in memory (single extra agg for mutuals)
    const poolSize = Math.min(100, Math.max(lim * 10, 30));
    const candidates = await User.find({ _id: { $nin: excluded } })
      .sort({ createdAt: -1 })
      .limit(poolSize)
      .select("fullName username avatarUrl bio college course academicYear followersCount createdAt")
      .lean();

    let mutualCounts = {};
    if (myFollowingIds.length > 0 && candidates.length > 0) {
      const rows = await Follow.aggregate([
        {
          $match: {
            follower: { $in: myFollowingIds },
            following: { $in: candidates.map((c) => c._id) },
          },
        },
        { $group: { _id: "$following", count: { $sum: 1 } } },
      ]);
      mutualCounts = Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
    }

    const norm = (s) => String(s || "").trim().toLowerCase();
    const scored = candidates.map((c) => {
      let score = 0;
      const reasons = [];
      const mutuals = mutualCounts[String(c._id)] || 0;
      if (mutuals > 0) {
        score += Math.min(mutuals, 3) * 2;
        reasons.push({ w: 3, t: mutuals === 1 ? "1 mutual" : `${mutuals} mutuals` });
      }
      if (viewer.college && c.college && norm(viewer.college) === norm(c.college)) {
        score += 10;
        reasons.push({ w: 4, t: "Same college" });
      }
      if (viewer.course && c.course && norm(viewer.course) === norm(c.course)) {
        score += 5;
        reasons.push({ w: 2, t: "Same course" });
      }
      if (viewer.academicYear && c.academicYear && viewer.academicYear === c.academicYear) {
        score += 3;
        reasons.push({ w: 1, t: "Same year" });
      }
      reasons.sort((a, b) => b.w - a.w);
      return { user: c, score, suggestReason: reasons[0]?.t || "New here" };
    });

    scored.sort((a, b) => b.score - a.score || b.user.createdAt - a.user.createdAt);

    const result = {
      users: scored.slice(0, lim).map(({ user, suggestReason }) => ({
        ...user,
        isFollowing: false,
        suggestReason,
      })),
    };
    cache.set(cacheKey, result, TTL.SUGGESTIONS);
    return result;
  },

  async getByUsername(username, viewerId = null) {
    const clean = username.toLowerCase().trim();
    const cacheKey = CacheKeys.userProfile(clean);
    let user = cache.get(cacheKey);

    if (!user) {
      user = await User.findOne({ username: clean }).populate({
        path: "pinnedPost",
        populate: { path: "author", select: "fullName username avatarUrl isEmailVerified" },
      });
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      cache.set(cacheKey, user, TTL.USER_PROFILE);
    }

    if (viewerId && String(viewerId) !== String(user._id)) {
      const rel = await blockService.relationOf(viewerId, user._id);
      if (rel) {
        throw new AppError("This profile is unavailable", 403, "PROFILE_BLOCKED", {
          username: user.username,
          userId: user._id,
          isBlocker: rel.isBlocker,
        });
      }
    }
    const safe = user.toSafeObject();
    if (viewerId && String(viewerId) !== String(user._id)) {
      const { Follow } = await import("../models/Follow.js");
      const exists = await Follow.exists({ follower: viewerId, following: user._id });
      safe.isFollowing = Boolean(exists);
    } else {
      safe.isFollowing = false;
    }
    return safe;
  },

  async updateAvatar(userId, file) {
    if (!file) throw new AppError("No file uploaded", 400, "NO_FILE");
    const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
    if (!isAppwriteConfigured()) {
      throw new AppError("Avatar upload not configured. Add APPWRITE_* env on backend.", 503, "APPWRITE_NOT_CONFIGURED");
    }
    const { viewUrl } = await uploadToAppwrite(file.buffer, file.originalname, file.mimetype);
    const user = await User.findByIdAndUpdate(userId, { $set: { avatarUrl: viewUrl } }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");
    return user.toSafeObject();
  },

  async updateCover(userId, file) {
    if (!file) throw new AppError("No file uploaded", 400, "NO_FILE");
    const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
    if (!isAppwriteConfigured()) {
      throw new AppError("Cover upload not configured. Add APPWRITE_* env on backend.", 503, "APPWRITE_NOT_CONFIGURED");
    }
    const { viewUrl } = await uploadToAppwrite(file.buffer, file.originalname, file.mimetype);
    // best-effort: delete old cover to avoid orphan files
    const current = await User.findById(userId).select("coverUrl").lean();
    const user = await User.findByIdAndUpdate(userId, { $set: { coverUrl: viewUrl } }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (current?.coverUrl && current.coverUrl !== viewUrl) {
      try {
        const { deleteFromAppwrite } = await import("../config/appwrite.js");
        const fileId = current.coverUrl.match(/\/files\/([^/]+)\//)?.[1];
        if (fileId) await deleteFromAppwrite(fileId);
      } catch {}
    }
    return user.toSafeObject();
  },

  async setPinnedPost(userId, postId) {
    if (!postId) {
      const user = await User.findByIdAndUpdate(userId, { $unset: { pinnedPost: 1 } }, { new: true });
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      cache.del(CacheKeys.userProfile(user.username));
      return user.toSafeObject();
    }
    const { Post } = await import("../models/Post.js");
    const post = await Post.findById(postId).select("author").lean();
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("You can only pin your own posts", 403, "FORBIDDEN");
    const user = await User.findByIdAndUpdate(userId, { $set: { pinnedPost: postId } }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    return user.toSafeObject();
  },

  async updateMe(userId, data) {
    const allowed = ["fullName", "bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent"];
    const update = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

    // normalize empty string -> null for optional fields
    for (const k of ["bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent"]) {
      if (update[k] === "") update[k] = null;
    }
    // socialLinks — accept object {github, twitter, linkedin, instagram} as username/handle only
    if (data.socialLinks && typeof data.socialLinks === "object") {
      const sl = {};
      for (const k of ["github", "twitter", "linkedin", "instagram"]) {
        if (data.socialLinks[k] !== undefined) {
          let v = String(data.socialLinks[k]).trim();
          if (v === "") v = null;
          // strip leading @ for twitter/instagram, strip url prefix for linkedin/github if pasted
          if (v && (k === "twitter" || k === "instagram")) v = v.replace(/^@/, "");
          if (v && k === "github") v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "").split("/")[0];
          if (v && k === "linkedin") {
            // allow full URL or handle
            v = v.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "");
          }
          sl[k] = v;
        }
      }
      // merge with existing to avoid wiping unspecified fields — fetch current then merge
      const current = await User.findById(userId).select("socialLinks");
      const merged = { ...(current?.socialLinks?.toObject?.() || current?.socialLinks || {}), ...sl };
      // handle nulls explicitly
      for (const k of Object.keys(sl)) merged[k] = sl[k];
      update.socialLinks = merged;
    }

    if (update.fullName !== undefined) {
      const v = String(update.fullName).trim();
      if (v.length < 2) throw new AppError("Full name must be at least 2 characters", 400, "VALIDATION_ERROR");
      if (v.length > 50) throw new AppError("Full name too long", 400, "VALIDATION_ERROR");
      update.fullName = v;
    }

    // Phase 0 colleges: maintain collegeSlug + College doc on change
    if (update.college !== undefined) {
      const { slugifyCollege } = await import("../utils/college.js");
      const prev = await User.findById(userId).select("collegeSlug").lean();
      const prevSlug = prev?.collegeSlug || null;
      const nextSlug = update.college ? slugifyCollege(update.college) : null;
      update.collegeSlug = nextSlug;
      // normalize display: collapse whitespace
      if (update.college) update.college = String(update.college).trim().replace(/\s+/g, " ").slice(0, 120);
      const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      if (prevSlug !== nextSlug) {
        try {
          const { College } = await import("../models/College.js");
          const { collegeService } = await import("./collegeService.js");
          if (nextSlug) {
            await collegeService.ensureCollege(user.college);
            await College.updateOne({ slug: nextSlug }, { $inc: { memberCount: 1 } });
          }
          if (prevSlug) {
            await College.updateOne({ slug: prevSlug }, { $inc: { memberCount: -1 } });
            await College.updateOne({ slug: prevSlug, memberCount: { $lt: 0 } }, { $set: { memberCount: 0 } });
          }
        } catch {}
      }
      return user.toSafeObject();
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    return user.toSafeObject();
  },
};
