import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { ConsentRecord } from "../models/ConsentRecord.js";
import { AppError } from "../utils/AppError.js";
import { blockService } from "./blockService.js";
import { privacyService } from "./privacyService.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";
import { calcAgeYears, parseDobInput } from "../utils/age.js";
import { normalizeHttpsUrl, MAX_CUSTOM_LINKS, MAX_CUSTOM_LINK_LABEL } from "../utils/links.js";
import { createAndSendOtp } from "./otpService.js";
import { assertCanUsePerk } from "../config/perks.js";
import {
  POLICY_VERSION,
  TERMS_VERSION,
  PRIVACY_VERSION,
  MIN_AGE,
  ADULT_AGE,
} from "../config/policy.js";

// Re-exported for callers that imported these from this service before the
// shared age helper existed.
export { calcAgeYears, parseDobInput };

function maskEmail(email) {
  return String(email || "").replace(/(^.).+(@.*)/, (m, a, b) => `${a}***${b}`);
}

function consentMeta(meta = {}) {
  return {
    ip: meta.ip || null,
    userAgent: meta.device?.userAgent || null,
  };
}

function extractFileId(url) {
  if (!url) return null;
  const m = String(url).match(/\/files\/([^/?#]+)/);
  return m ? m[1] : null;
}

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
      // Public directory rows must never carry account/consent fields.
      const {
        passwordHash, refreshTokenHash, __v, dob, dobSetAt,
        consent, guardian, isMinor,
        email, isEmailVerified, lastLoginAt,
        isSuspended, suspendedAt, suspendReason,
        accountStatus, accountStatusReason, accountStatusAt,
        restrictedUntil, restrictedAt, restrictionReason,
        isBanned, bannedAt, banReason, banSetDeactivated,
        ...rest
      } = u;
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
      .select("fullName username avatarUrl bio college course academicYear followersCount createdAt isEmailVerified isVerified isPro isOwner achievementTier streakCount")
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
        populate: { path: "author", select: "fullName username avatarUrl isEmailVerified isVerified isPro isOwner achievementTier streakCount" },
      });
      if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      cache.set(cacheKey, user, TTL.USER_PROFILE);
    }

    // Deactivated: only the owner can view; others get unavailable.
    if (user.isDeactivated && String(viewerId || "") !== String(user._id)) {
      throw new AppError("This profile is unavailable", 404, "USER_NOT_FOUND");
    }
    // A permanent ban hides the profile from everyone, including a stale
    // session that has not been revoked yet.
    if (user.isBanned && String(viewerId || "") !== String(user._id)) {
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
    // Own-only fields. A public profile is a profile card, never an account
    // record: email, verification state, login history and moderation
    // standing stay with the owner (they surface on /menu for the owner).
    if (String(viewerId || "") !== String(user._id)) {
      for (const k of [
        "email",
        "isEmailVerified",
        "consent",
        "guardian",
        "isMinor",
        "dob",
        "dobSetAt",
        "lastLoginAt",
        "isSuspended",
        "suspendedAt",
        "suspendReason",
        "accountStatus",
        "accountStatusReason",
        "accountStatusAt",
        "restrictedUntil",
        "restrictedAt",
        "restrictionReason",
        "isBanned",
        "bannedAt",
        "banReason",
        "banSetDeactivated",
      ]) {
        delete safe[k];
      }
    }
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
    import("../services/achievementService.js")
      .then(({ achievementService }) => achievementService.evaluate(userId))
      .catch(() => {});
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
    import("../services/achievementService.js")
      .then(({ achievementService }) => achievementService.evaluate(userId))
      .catch(() => {});
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
    const post = await Post.findById(postId).select("author isAnonymous").lean();
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Anonymous posts can't be pinned", 403, "ANON_ACTION_NOT_ALLOWED");
    if (String(post.author) !== String(userId)) throw new AppError("You can only pin your own posts", 403, "FORBIDDEN");
    const user = await User.findByIdAndUpdate(userId, { $set: { pinnedPost: postId } }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    return user.toSafeObject();
  },

  async updateMe(userId, data) {
    if (data?.dob !== undefined) throw new AppError("Date of birth can only be set once via /me/dob", 400, "DOB_IMMUTABLE");

    // Cosmetic perks are the only paid surface. A free account may clear a
    // Pro value, but it can never save one — the UI lock is never the gate.
    const cosmeticKeys = ["accent", "profileTheme", "handleStyle"];
    const requestedCosmetics = cosmeticKeys.filter((k) => data?.[k] !== undefined);
    if (requestedCosmetics.length) {
      const current = await User.findById(userId).select("isPro").lean();
      if (!current) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      for (const k of requestedCosmetics) assertCanUsePerk(current, k, data[k]);
    }

    const allowed = ["fullName", "bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent", "profileTheme", "handleStyle", "isPrivate", "replyPolicy", "mentionPolicy", "profileVisibility", "showSensitive", "customLinks"];
    const update = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

    // ── Privacy validation ─────────────────────────────────────
    if (update.isPrivate !== undefined) update.isPrivate = Boolean(update.isPrivate);
    if (update.showSensitive !== undefined) update.showSensitive = Boolean(update.showSensitive);
    // Same 18+ gate as updatePrivacy — DOB + 18+ required for false→true.
    if (update.showSensitive === true) {
      const cur = await User.findById(userId).select("showSensitive dob").lean();
      if (!cur) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      if (cur.showSensitive !== true) {
        if (!cur.dob) throw new AppError("Date of birth required to enable 18+ posts", 400, "DOB_REQUIRED");
        if (calcAgeYears(cur.dob) < 18) throw new AppError("You must be 18 or older to enable 18+ posts", 403, "UNDERAGE");
      }
    }
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
    for (const k of ["bio", "college", "course", "academicYear", "avatarUrl", "coverUrl", "accent", "profileTheme", "handleStyle"]) {
      if (update[k] === "") update[k] = null;
    }
    // The named defaults are stored as null so a later downgrade cannot make
    // the profile depend on a paid value that is no longer unlocked.
    if (update.profileTheme === "flat") update.profileTheme = null;
    if (update.handleStyle === "classic") update.handleStyle = null;
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

    // Custom profile links — at most three labelled HTTPS URLs. The route
    // schema checks shape; this pass normalizes values and is the final gate
    // for direct service callers too.
    if (data.customLinks !== undefined) {
      if (!Array.isArray(data.customLinks)) {
        throw new AppError("Custom links must be an array", 400, "VALIDATION_ERROR");
      }
      if (data.customLinks.length > MAX_CUSTOM_LINKS) {
        throw new AppError(`You can add up to ${MAX_CUSTOM_LINKS} custom links`, 400, "VALIDATION_ERROR");
      }
      const links = [];
      const seen = new Set();
      for (const [index, item] of data.customLinks.entries()) {
        const label = String(item?.label ?? "").trim().replace(/\s+/g, " ");
        const url = normalizeHttpsUrl(item?.url);
        if (!label || label.length > MAX_CUSTOM_LINK_LABEL) {
          throw new AppError(`Link ${index + 1} needs a label of 1–${MAX_CUSTOM_LINK_LABEL} characters`, 400, "VALIDATION_ERROR");
        }
        if (!url) {
          throw new AppError(`Link ${index + 1} needs a valid HTTPS URL`, 400, "VALIDATION_ERROR");
        }
        if (seen.has(url)) {
          throw new AppError("Custom links must be unique", 400, "VALIDATION_ERROR");
        }
        seen.add(url);
        links.push({ label, url });
      }
      update.customLinks = links;
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
      import("../services/achievementService.js")
        .then(({ achievementService }) => achievementService.evaluate(userId))
        .catch(() => {});
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
    import("../services/achievementService.js")
      .then(({ achievementService }) => achievementService.evaluate(userId))
      .catch(() => {});

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
    if (data.showSensitive !== undefined) update.showSensitive = Boolean(data.showSensitive);
    if (data.replyPolicy !== undefined) {
      if (!["everyone", "followers", "none"].includes(data.replyPolicy)) throw new AppError("Invalid reply policy", 400, "VALIDATION_ERROR");
      update.replyPolicy = data.replyPolicy;
    }
    if (data.mentionPolicy !== undefined) {
      if (!["everyone", "followers", "none"].includes(data.mentionPolicy)) throw new AppError("Invalid mention policy", 400, "VALIDATION_ERROR");
      update.mentionPolicy = data.mentionPolicy;
    }
    // 18+ gate: enabling showSensitive (false→true) requires a saved DOB
    // proving age >= 18. Grandfathered users already ON stay on. Turning
    // off is always allowed. DOB itself can never be changed here.
    if (update.showSensitive === true) {
      const cur = await User.findById(userId).select("showSensitive dob").lean();
      if (!cur) throw new AppError("User not found", 404, "USER_NOT_FOUND");
      const alreadyOn = cur.showSensitive === true;
      if (!alreadyOn) {
        if (!cur.dob) throw new AppError("Date of birth required to enable 18+ posts", 400, "DOB_REQUIRED");
        if (calcAgeYears(cur.dob) < 18) throw new AppError("You must be 18 or older to enable 18+ posts", 403, "UNDERAGE");
      }
    }
    if (data.dob !== undefined) throw new AppError("Date of birth can't be changed here", 400, "DOB_IMMUTABLE");
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

  // One-shot DOB entry for accounts that predate the age gate. DOB is saved
  // even when under 18 (permanent lock). 13-17 accounts get a pending guardian
  // consent and cannot write until the guardian approves.
  async setDobOnce(userId, dobInput, guardianInput = {}) {
    const dob = parseDobInput(dobInput);
    const age = calcAgeYears(dob);
    if (age < MIN_AGE) {
      throw new AppError("CampusZen is for users aged 13 and over.", 403, "UNDERAGE");
    }

    const cur = await User.findById(userId).select("dob username email").lean();
    if (!cur) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (cur.dob) throw new AppError("Date of birth is already set and can't be changed", 403, "DOB_ALREADY_SET");

    const isMinor = age < ADULT_AGE;
    let guardian = { consentStatus: "not_required", name: null, email: null };
    if (isMinor) {
      const name = String(guardianInput.guardianName || "").trim();
      const email = String(guardianInput.guardianEmail || "").toLowerCase().trim();
      if (name.length < 2 || name.length > 80) {
        throw new AppError("A parent or guardian's name is required for users under 18.", 400, "GUARDIAN_REQUIRED");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError("A valid parent or guardian email is required for users under 18.", 400, "GUARDIAN_REQUIRED");
      }
      if (email === cur.email) {
        throw new AppError("The guardian email must be different from your own email.", 400, "GUARDIAN_EMAIL_INVALID");
      }
      guardian = { name, email, consentStatus: "pending" };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { dob, dobSetAt: new Date(), isMinor, guardian } },
      { new: true, runValidators: true },
    );
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");

    if (isMinor) {
      try {
        await createAndSendOtp({ email: guardian.email, type: "guardian", childEmail: cur.email });
      } catch (err) {
        // DOB is saved; the consent gate lets the user resend once the
        // guardian email is correct.
        console.error("[user] guardian consent email failed:", err.message);
      }
    }

    const safe = user.toSafeObject();
    return {
      user: safe,
      age,
      isAdult: !isMinor,
      parentalConsentRequired: isMinor,
      guardianEmail: isMinor ? maskEmail(guardian.email) : null,
    };
  },

  // Daily posting streak: consecutive UTC days with at least one post/article.
  async updateStreak(userId) {
    const user = await User.findById(userId)
      .select("streakCount lastStreakDate longestStreak lastPostAt username isMinor")
      .lean();
    if (!user) return { streakCount: 0 };
    // DPDP s.9: no behavioural monitoring of children. Streaks are an
    // engagement-tracking feature, so they are disabled for under-18 accounts.
    if (user.isMinor) return { streakCount: 0, disabled: true };

    const now = new Date();
    // Anti-gaming cooldown: a new streak day only counts when the previous
    // counted post is at least 6 hours old. Bursts within 6h never extend.
    const cooldownMs = 6 * 60 * 60 * 1000;
    const cooldownOk = !user.lastPostAt || now.getTime() - new Date(user.lastPostAt).getTime() >= cooldownMs;

    const utcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const today = utcDay(now);
    const last = user.lastStreakDate ? utcDay(new Date(user.lastStreakDate)) : null;

    let next = Number(user.streakCount) || 0;
    if (cooldownOk && (!last || last.getTime() !== today.getTime())) {
      const yesterday = new Date(today.getTime() - 86400000);
      if (last && last.getTime() === yesterday.getTime()) next = (Number(user.streakCount) || 0) + 1;
      else next = 1;
    }
    const longest = Math.max(Number(user.longestStreak) || 0, next);

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { streakCount: next, lastStreakDate: today, longestStreak: longest, lastPostAt: now } },
      { new: true },
    );
    if (updated) {
      cache.del(CacheKeys.userProfile(updated.username));
      cache.delPattern("user:*");
    }
    return { streakCount: next, longestStreak: longest };
  },

  // DPDP access/portability export: profile + content + graph + account
  // records. Secrets (password hash, refresh hashes, push auth keys) are
  // deliberately excluded.
  async exportData(userId) {
    const [
      user, posts, comments, likes, reposts, bookmarks, follows, followers,
      blocks, reports, sessions, notifications, pushSubscriptions, postViews,
      appeals, verificationRequests, reportsAboutMe, consentRecords,
      followRequests,
    ] = await Promise.all([
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
      Session.find({ user: userId }).select("device ip remember createdAt lastUsedAt expiresAt").lean(),
      import("../models/Notification.js").then(({ Notification }) =>
        Notification.find({ $or: [{ recipient: userId }, { actor: userId }] })
          .select("type read title body createdAt").lean()),
      import("../models/PushSubscription.js").then(({ PushSubscription }) =>
        PushSubscription.find({ user: userId }).select("endpoint device createdAt lastUsedAt").lean()),
      import("../models/PostView.js").then(({ PostView }) =>
        PostView.find({ viewer: userId }).select("post dayKey createdAt").lean()),
      import("../models/Appeal.js").then(({ Appeal }) => Appeal.find({ appellant: userId }).lean()),
      import("../models/VerificationRequest.js").then(({ VerificationRequest }) =>
        VerificationRequest.find({ user: userId }).lean()),
      // Reports *about* the user are their personal data too, but never expose
      // the reporter's identity in the export.
      import("../models/Report.js").then(({ Report }) =>
        Report.find({ targetType: "user", targetId: userId })
          .select("reason status createdAt").lean()),
      ConsentRecord.find({ user: userId }).sort({ createdAt: -1 }).lean(),
      import("../models/FollowRequest.js").then(({ FollowRequest }) =>
        FollowRequest.find({ $or: [{ requester: userId }, { target: userId }] })
          .populate("requester target", "username fullName")
          .lean()
      ),
    ]);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const { passwordHash, refreshTokenHash, __v, ...profile } = user;
    return {
      exportedAt: new Date().toISOString(),
      dataFiduciary: "CampusZen",
      policyVersion: PRIVACY_VERSION,
      profile,
      privacy: {
        isPrivate: user.isPrivate,
        replyPolicy: user.replyPolicy,
        mentionPolicy: user.mentionPolicy,
        profileVisibility: user.profileVisibility,
        showSensitive: user.showSensitive,
      },
      consent: {
        current: profile.consent || null,
        guardian: profile.guardian || null,
        history: consentRecords,
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
      reportsAboutMe,
      followRequests,
      sessions,
      notifications,
      pushSubscriptions,
      postViews,
      appeals,
      verificationRequests,
      counts: {
        posts: posts.length,
        comments: comments.length,
        following: follows.length,
        followers: followers.length,
        sessions: sessions.length,
        notifications: notifications.length,
        postViews: postViews.length,
      },
    };
  },

  // Re-consent after a policy version change, or first consent for accounts
  // created before the ledger existed. Records an append-only ConsentRecord.
  async recordConsent(userId, { analytics }, meta = {}) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (!user.consent) user.consent = {};
    user.consent.termsVersion = TERMS_VERSION;
    user.consent.privacyVersion = PRIVACY_VERSION;
    user.consent.acceptedAt = new Date();
    user.consent.withdrawnAt = null;
    if (analytics !== undefined) user.consent.analytics = user.isMinor ? false : Boolean(analytics);
    user.consent.ip = consentMeta(meta).ip;
    user.consent.userAgent = consentMeta(meta).userAgent;
    await user.save();

    await ConsentRecord.create({
      user: user._id,
      policyVersion: POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      purposes: user.consent.analytics ? ["core", "analytics"] : ["core"],
      action: "granted",
      method: "self",
      ...consentMeta(meta),
    });

    cache.del(CacheKeys.userProfile(user.username));
    cache.delPattern("user:*");
    return user.toSafeObject();
  },

  // Withdrawal of core consent is an erasure request: hide the account now and
  // let the scheduled purge remove it. Optional analytics consent can be
  // withdrawn from the same endpoint without deleting the account by passing
  // { core: false }.
  async withdrawConsent(userId, { core = true } = {}, meta = {}) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (!core) {
      if (!user.consent) user.consent = {};
      user.consent.analytics = false;
      await user.save();
      await ConsentRecord.create({
        user: user._id,
        policyVersion: POLICY_VERSION,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        purposes: ["analytics"],
        action: "withdrawn",
        method: "self",
        ...consentMeta(meta),
      });
      return { message: "Analytics consent withdrawn.", accountScheduledForDeletion: false };
    }

    user.consent.withdrawnAt = new Date();
    // Withdrawal must stop processing immediately, not just hide the account:
    // clearing the accepted notice also blocks writes from any access token
    // that is still alive for its remaining 15 minutes.
    user.consent.acceptedAt = null;
    user.consent.termsVersion = null;
    user.consent.privacyVersion = null;
    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.scheduledDeletionAt = new Date();
    user.refreshTokenHash = null;
    await user.save();
    await Promise.all([
      Session.deleteMany({ user: userId }),
      import("../models/PushSubscription.js").then(({ PushSubscription }) =>
        PushSubscription.deleteMany({ user: userId })
      ),
    ]);

    await ConsentRecord.create({
      user: user._id,
      policyVersion: POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      purposes: ["core"],
      action: "withdrawn",
      method: "self",
      ...consentMeta(meta),
    });

    cache.delPattern("user:*");
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    return {
      message: "Consent withdrawn. Your account is scheduled for deletion.",
      accountScheduledForDeletion: true,
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
    // Deactivation must actually end device sessions. Without this, a session
    // issued before deactivation keeps working until its refresh token expires.
    await Promise.all([
      Session.deleteMany({ user: userId }),
      import("../models/PushSubscription.js").then(({ PushSubscription }) =>
        PushSubscription.deleteMany({ user: userId })
      ),
    ]);
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
  // Removes the user, every owned row, consent evidence, and stored media.
  async purge(userId) {
    const user = await User.findById(userId)
      .select("_id username email avatarUrl coverUrl guardian.email")
      .lean();
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const [
      { Post }, { Comment }, { Like }, { Repost }, { Bookmark }, { PollVote },
      { Follow }, { Block }, { Notification }, { Report }, { FollowRequest },
      { Appeal }, { VerificationRequest }, { PushSubscription }, { PostView },
      { Otp }, { AdminBroadcast },
    ] = await Promise.all([
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
      import("../models/PushSubscription.js"),
      import("../models/PostView.js"),
      import("../models/Otp.js"),
      import("../models/AdminBroadcast.js"),
    ]);

    const posts = await Post.find({ author: userId }).select("_id media imageUrl").lean();
    const postIds = posts.map((p) => p._id);
    const comments = await Comment.find({ author: userId }).select("_id").lean();
    const commentIds = comments.map((c) => c._id);

    // Collect every Appwrite file before the rows that reference them vanish.
    const fileIds = new Set();
    const addFile = (url) => {
      const id = extractFileId(url);
      if (id) fileIds.add(id);
    };
    addFile(user.avatarUrl);
    addFile(user.coverUrl);
    for (const p of posts) {
      addFile(p.imageUrl);
      for (const m of p.media || []) {
        if (m.fileId) fileIds.add(m.fileId);
        if (m.posterFileId) fileIds.add(m.posterFileId);
        addFile(m.url);
        addFile(m.posterUrl);
      }
    }

    await Promise.all([
      Comment.deleteMany({ $or: [{ author: userId }, { post: { $in: postIds } }] }),
      Like.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Repost.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Bookmark.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      PollVote.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Post.deleteMany({ author: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }, { post: { $in: postIds } }, { post: { $in: commentIds } }] }),
      Report.deleteMany({ $or: [{ reporter: userId }, { targetId: userId }, { targetId: { $in: postIds } }, { targetId: { $in: commentIds } }] }),
      FollowRequest.deleteMany({ $or: [{ requester: userId }, { target: userId }] }),
      Appeal.deleteMany({ appellant: userId }),
      VerificationRequest.deleteMany({ user: userId }),
      Session.deleteMany({ user: userId }),
      PushSubscription.deleteMany({ user: userId }),
      PostView.deleteMany({ $or: [{ viewer: userId }, { post: { $in: postIds } }] }),
      Otp.deleteMany({ email: { $in: [user.email, user.guardian?.email].filter(Boolean) } }),
      ConsentRecord.deleteMany({ user: userId }),
      AdminBroadcast.updateMany(
        { $or: [{ userIds: userId }, { recipientSample: userId }] },
        { $pull: { userIds: userId, recipientSample: userId } }
      ),
      User.updateMany({ pinnedPost: { $in: postIds } }, { $unset: { pinnedPost: 1 } }),
    ]);

    if (fileIds.size) {
      try {
        const { deleteFromAppwrite } = await import("../config/appwrite.js");
        await Promise.allSettled([...fileIds].map((id) => deleteFromAppwrite(id)));
      } catch (err) {
        console.error("[purge] media cleanup failed:", err.message);
      }
    }

    await User.deleteOne({ _id: userId });
    cache.delPattern("user:*");
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    return { deleted: true, username: user.username };
  },

  // Runs at boot and on a timer. Deactivation is only a promise until this
  // actually executes, so it is deliberately small and idempotent.
  async purgeExpiredAccounts({ limit = 25 } = {}) {
    const due = await User.find({
      isDeactivated: true,
      scheduledDeletionAt: { $lte: new Date() },
    })
      .select("_id")
      .limit(limit)
      .lean();

    let purged = 0;
    for (const row of due) {
      try {
        await this.purge(row._id);
        purged += 1;
      } catch (err) {
        console.error(`[purge] account ${row._id} failed:`, err.message);
      }
    }
    return { due: due.length, purged };
  },
};
