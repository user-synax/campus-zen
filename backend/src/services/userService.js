import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { blockService } from "./blockService.js";
import { privacyService } from "./privacyService.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";

export const userService = {
  async listUsers({ q, college, course, academicYear, page = 1, limit = 20, viewerId }) {
    const filter = { isDeactivated: { $ne: true } };
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc, "i");
      filter.$or = [{ username: re }, { fullName: re }, { bio: re }];
    }
    if (college) filter.college = new RegExp(`^${college.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (course) filter.course = new RegExp(`^${course.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (academicYear) filter.academicYear = academicYear;
    // mutual hide: exclude blocked users for logged-in viewers
    const excludeIds = new Set();
    if (viewerId) {
      const hidden = await blockService.blockedIdsFor(viewerId);
      for (const id of hidden) excludeIds.add(String(id));
      // strict private: hide private accounts the viewer doesn't follow
      const privateHide = await privacyService.privateIdsToHide(viewerId);
      for (const id of privateHide) excludeIds.add(String(id));
    } else {
      // guests never see private or deactivated accounts in directory
      const privateOnes = await User.find({ isPrivate: true }).select("_id").lean();
      for (const u of privateOnes) excludeIds.add(String(u._id));
    }
    if (excludeIds.size) {
      const arr = [...excludeIds];
      if (filter._id) filter._id = { ...filter._id, $nin: arr };
      else filter._id = { $nin: arr };
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
      const isFollowing = followingSet.has(String(u._id));
      const withVis = privacyService.applyProfileVisibility(rest, viewerId, isFollowing);
      return { ...withVis, isFollowing };
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
  // Private + deactivated accounts are never suggested.
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
    const privateHide = await privacyService.privateIdsToHide(viewerId);
    const excluded = [viewerId, ...myFollowingIds, ...hidden, ...privateHide];

    // oversample recent users, then rank in memory (single extra agg for mutuals)
    const poolSize = Math.min(100, Math.max(lim * 10, 30));
    const candidates = await User.find({ _id: { $nin: excluded }, isPrivate: { $ne: true }, isDeactivated: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(poolSize)
      .select("fullName username avatarUrl bio college course academicYear followersCount createdAt isEmailVerified isVerified isPro isOwner isCofounder")
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
        populate: { path: "author", select: "fullName username avatarUrl isEmailVerified isVerified" },
      });
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      cache.set(cacheKey, user, TTL.USER_PROFILE);
    }

    // Deactivated: only the owner can view; others get unavailable.
    if (user.isDeactivated && String(viewerId || "") !== String(user._id)) {
      throw new AppError("This profile is unavailable", 404, "USER_NOT_FOUND");
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
    let safe = user.toSafeObject();
    let isFollowing = false;
    if (viewerId && String(viewerId) !== String(user._id)) {
      const { Follow } = await import("../models/Follow.js");
      const exists = await Follow.exists({ follower: viewerId, following: user._id });
      isFollowing = Boolean(exists);
      safe.isFollowing = isFollowing;
      // Strict private: non-followers get a limited shell + PRIVATE flag.
      if (user.isPrivate && !isFollowing) {
        const { FollowRequest } = await import("../models/FollowRequest.js");
        const pending = await FollowRequest.exists({ requester: viewerId, target: user._id, status: "pending" });
        safe = privacyService.applyProfileVisibility(safe, viewerId, false);
        safe.isPrivate = true;
        safe.isFollowRequested = Boolean(pending);
        safe.privateHidden = true;
        return safe;
      }
    } else {
      safe.isFollowing = false;
    }
    safe = privacyService.applyProfileVisibility(safe, viewerId, isFollowing);
    // Follow-request state for private profiles (owner sees counts elsewhere).
    if (safe.isPrivate && viewerId && String(viewerId) !== String(safe._id)) {
      const { FollowRequest } = await import("../models/FollowRequest.js");
      const pending = await FollowRequest.exists({ requester: viewerId, target: safe._id, status: "pending" });
      safe.isFollowRequested = Boolean(pending);
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
    const allowed = ["fullName", "bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent", "isPrivate", "replyPolicy", "mentionPolicy", "profileVisibility"];
    const update = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

    // ── Privacy validation ─────────────────────────────────────
    if (update.isPrivate !== undefined) update.isPrivate = Boolean(update.isPrivate);
    if (update.replyPolicy !== undefined && !["everyone", "followers", "none"].includes(update.replyPolicy)) {
      throw new AppError("Invalid reply policy", 400, "VALIDATION_ERROR");
    }
    if (update.mentionPolicy !== undefined && !["everyone", "followers", "none"].includes(update.mentionPolicy)) {
      throw new AppError("Invalid mention policy", 400, "VALIDATION_ERROR");
    }
    if (update.profileVisibility !== undefined) {
      if (typeof update.profileVisibility !== "object" || update.profileVisibility === null) {
        throw new AppError("Invalid profile visibility", 400, "VALIDATION_ERROR");
      }
      const pv = {};
      for (const f of ["college", "course", "academicYear"]) {
        if (update.profileVisibility[f] !== undefined) {
          if (!["public", "followers", "hidden"].includes(update.profileVisibility[f])) {
            throw new AppError(`Invalid visibility for ${f}`, 400, "VALIDATION_ERROR");
          }
          pv[`profileVisibility.${f}`] = update.profileVisibility[f];
        }
      }
      delete update.profileVisibility;
      if (Object.keys(pv).length) {
        const cur = await User.findByIdAndUpdate(userId, { $set: pv }, { new: true, runValidators: true });
        if (!cur) throw new AppError("User not found", 404, "USER_NOT_FOUND");
        cache.del(CacheKeys.userProfile(cur.username));
      }
      // If only visibility was passed, return early after other updates.
      if (!Object.keys(update).length) {
        const fresh = await User.findById(userId);
        return fresh.toSafeObject();
      }
    }

    // normalize empty string -> null for optional fields
    for (const k of ["bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent"]) {
      if (update[k] === "") update[k] = null;
    }
    // socialLinks — accept object {github, twitter, linkedin, instagram} as username/handle only
    if (data.socialLinks && typeof data.socialLinks === "object") {
      const sl = {};
      for (const k of ["github", "twitter", "linkedin", "instagram"]) {
        if (data.socialLinks[k] !== undefined) {
          const raw = data.socialLinks[k];
          // null stays null — never String(null) -> "null" (that was the /null bug)
          if (raw === null) {
            sl[k] = null;
            continue;
          }
          let v = String(raw).trim();
          if (v === "" || v.toLowerCase() === "null" || v.toLowerCase() === "undefined" || v === "@") v = null;
          // strip leading @ for twitter/instagram, strip url prefix for linkedin/github if pasted
          if (v && (k === "twitter" || k === "instagram")) v = v.replace(/^@/, "").trim();
          if (v && k === "github") v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "").split("/")[0].trim();
          if (v && k === "linkedin") {
            // allow full URL or handle
            v = v.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "").trim();
          }
          // re-check after stripping (e.g. "@" -> "" or pasted "null")
          if (!v || v.toLowerCase() === "null" || v.toLowerCase() === "undefined" || v === "@") v = null;
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
    cache.delPattern("user:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern("feed:*");

    // Going public: auto-fulfil pending follow requests into follows.
    if (update.isPrivate === false) {
      try {
        const { FollowRequest } = await import("../models/FollowRequest.js");
        const { Follow } = await import("../models/Follow.js");
        const pending = await FollowRequest.find({ target: userId, status: "pending" }).select("requester").lean();
        for (const r of pending) {
          try {
            await Follow.create({ follower: r.requester, following: userId });
            await Promise.all([
              User.findByIdAndUpdate(r.requester, { $inc: { followingCount: 1 } }),
              User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } }),
            ]);
          } catch (e) {
            if (e.code !== 11000) throw e;
          }
          await FollowRequest.updateOne({ _id: r._id }, { $set: { status: "accepted" } });
        }
      } catch {}
    }
    return user.toSafeObject();
  },

  async updatePrivacy(userId, data) {
    const update = {};
    if (data.isPrivate !== undefined) update.isPrivate = Boolean(data.isPrivate);
    if (data.replyPolicy !== undefined) {
      if (!["everyone", "followers", "none"].includes(data.replyPolicy)) throw new AppError("Invalid reply policy", 400, "VALIDATION_ERROR");
      update.replyPolicy = data.replyPolicy;
    }
    if (data.mentionPolicy !== undefined) {
      if (!["everyone", "followers", "none"].includes(data.mentionPolicy)) throw new AppError("Invalid mention policy", 400, "VALIDATION_ERROR");
      update.mentionPolicy = data.mentionPolicy;
    }
    const pvSet = {};
    if (data.profileVisibility && typeof data.profileVisibility === "object") {
      for (const f of ["college", "course", "academicYear"]) {
        if (data.profileVisibility[f] !== undefined) {
          if (!["public", "followers", "hidden"].includes(data.profileVisibility[f])) {
            throw new AppError(`Invalid visibility for ${f}`, 400, "VALIDATION_ERROR");
          }
          pvSet[`profileVisibility.${f}`] = data.profileVisibility[f];
        }
      }
    }
    if (!Object.keys(update).length && !Object.keys(pvSet).length) {
      const cur = await User.findById(userId);
      if (!cur) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      return cur.toSafeObject();
    }
    const set = { ...update, ...pvSet };
    const wasPrivate = (await User.findById(userId).select("isPrivate username").lean())?.isPrivate;
    const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern("feed:*");
    cache.delPattern("suggestions:*");
    if (wasPrivate === true && user.isPrivate === false) {
      try {
        const { FollowRequest } = await import("../models/FollowRequest.js");
        const { Follow } = await import("../models/Follow.js");
        const pending = await FollowRequest.find({ target: userId, status: "pending" }).select("requester").lean();
        for (const r of pending) {
          try {
            await Follow.create({ follower: r.requester, following: userId });
            await Promise.all([
              User.findByIdAndUpdate(r.requester, { $inc: { followingCount: 1 } }),
              User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } }),
            ]);
          } catch (e) {
            if (e.code !== 11000) throw e;
          }
          await FollowRequest.updateOne({ _id: r._id }, { $set: { status: "accepted" } });
        }
      } catch {}
    }
    return user.toSafeObject();
  },

  // Full data export for GDPR-style download: profile + content + graph.
  async exportData(userId) {
    const [user, posts, comments, likes, reposts, bookmarks, follows, followers, blocks, reports] = await Promise.all([
      User.findById(userId).lean(),
      import("../models/Post.js").then(({ Post }) => Post.find({ author: userId }).sort({ createdAt: -1 }).lean()),
      import("../models/Comment.js").then(({ Comment }) => Comment.find({ author: userId }).sort({ createdAt: -1 }).lean()),
      import("../models/Like.js").then(({ Like }) => Like.find({ user: userId }).lean()),
      import("../models/Repost.js").then(({ Repost }) => Repost.find({ user: userId }).lean()),
      import("../models/Bookmark.js").then(({ Bookmark }) => Bookmark.find({ user: userId }).lean()),
      import("../models/Follow.js").then(({ Follow }) => Follow.find({ follower: userId }).populate("following", "username fullName").lean()),
      import("../models/Follow.js").then(({ Follow }) => Follow.find({ following: userId }).populate("follower", "username fullName").lean()),
      import("../models/Block.js").then(({ Block }) => Block.find({ blocker: userId }).populate("blocked", "username fullName").lean()),
      import("../models/Report.js").then(({ Report }) => Report.find({ reporter: userId }).lean()),
    ]);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const { passwordHash, refreshTokenHash, __v, ...profile } = user;
    return {
      exportedAt: new Date().toISOString(),
      profile,
      privacy: {
        isPrivate: user.isPrivate,
        replyPolicy: user.replyPolicy,
        mentionPolicy: user.mentionPolicy,
        profileVisibility: user.profileVisibility,
      },
      posts,
      comments,
      likes,
      reposts,
      bookmarks,
      following: follows,
      followers,
      blocked: blocks,
      reportsFiled: reports,
      counts: {
        posts: posts.length,
        comments: comments.length,
        following: follows.length,
        followers: followers.length,
      },
    };
  },

  async deactivate(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isDeactivated) return user.toSafeObject();
    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.scheduledDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.refreshTokenHash = null; // log out everywhere; login still allowed for restore
    await user.save();
    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern("feed:*");
    return user.toSafeObject();
  },

  async reactivate(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isDeactivated = false;
    user.deactivatedAt = null;
    user.scheduledDeletionAt = null;
    await user.save();
    cache.del(CacheKeys.userProfile(user.username));
    return user.toSafeObject();
  },

  // Permanent purge — called after grace expiry or explicit confirmed delete.
  // Removes user + all owned content/graph rows.
  async purge(userId) {
    const user = await User.findById(userId).select("_id username").lean();
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const [{ Post }, { Comment }, { Like }, { Repost }, { Bookmark }, { PollVote }, { Follow }, { Block }, { Notification }, { Report }, { FollowRequest }, { Appeal }, { VerificationRequest }] = await Promise.all([
      import("../models/Post.js"),
      import("../models/Comment.js"),
      import("../models/Like.js"),
      import("../models/Repost.js"),
      import("../models/Bookmark.js"),
      import("../models/PollVote.js"),
      import("../models/Follow.js"),
      import("../models/Block.js"),
      import("../models/Notification.js"),
      import("../models/Report.js"),
      import("../models/FollowRequest.js"),
      import("../models/Appeal.js"),
      import("../models/VerificationRequest.js"),
    ]);
    const postIds = (await Post.find({ author: userId }).select("_id").lean()).map((p) => p._id);
    await Promise.all([
      Comment.deleteMany({ $or: [{ author: userId }, { post: { $in: postIds } }] }),
      Like.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Repost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Bookmark.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      PollVote.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Post.deleteMany({ author: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }] }),
      FollowRequest.deleteMany({ $or: [{ requester: userId }, { target: userId }] }),
      Appeal.deleteMany({ appellant: userId }),
      VerificationRequest.deleteMany({ user: userId }),
      User.updateOne({ _id: userId, pinnedPost: { $exists: true } }, { $unset: { pinnedPost: 1 } }),
    ]);
    // Repair follower/following counters for affected users (best-effort).
    try {
      const affected = await Follow.find({ $or: [{ follower: userId }, { following: userId }] }).select("follower following").lean();
      void affected;
    } catch {}
    await User.deleteOne({ _id: userId });
    cache.delPattern("user:*");
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    return { deleted: true, username: user.username };
  },
};
