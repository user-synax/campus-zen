import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";

export const VISIBILITY_LEVELS = ["public", "followers", "hidden"];
export const REPLY_POLICIES = ["everyone", "followers", "none"];
export const MENTION_POLICIES = ["everyone", "followers", "none"];

// Central privacy helpers — single source of truth for audience checks.
export const privacyService = {
  async isFollowing(followerId, followingId) {
    if (!followerId || !followingId) return false;
    if (String(followerId) === String(followingId)) return true; // self always counts
    const exists = await Follow.exists({ follower: followerId, following: followingId });
    return Boolean(exists);
  },

  async isDeactivated(userId) {
    if (!userId) return false;
    const u = await User.findById(userId).select("isDeactivated").lean();
    return Boolean(u?.isDeactivated);
  },

  // Can viewer see target's posts/profile detail? Strict private:
  // owner + followers only. Deactivated: owner only (others see unavailable).
  async canViewPrivateTarget(viewerId, target) {
    if (!target) return false;
    if (target.isDeactivated && String(viewerId || "") !== String(target._id || target)) return false;
    if (!target.isPrivate) return true;
    if (!viewerId) return false;
    if (String(viewerId) === String(target._id || target)) return true;
    return this.isFollowing(viewerId, target._id || target);
  },

  // Exclude private + deactivated author ids from discovery surfaces.
  // Returns a Set of author ids to exclude (in addition to blocked).
  async privateIdsToHide(viewerId) {
    // All private users the viewer does NOT follow (and is not).
    const [privateUsers, deactivatedUsers] = await Promise.all([
      User.find({ isPrivate: true }).select("_id").lean(),
      User.find({ isDeactivated: true }).select("_id").lean(),
    ]);
    const deactivatedSet = new Set(deactivatedUsers.map((u) => String(u._id)));
    if (!viewerId) {
      return new Set([...privateUsers.map((u) => String(u._id)), ...deactivatedSet]);
    }
    const privateIds = privateUsers.map((u) => u._id).filter((id) => String(id) !== String(viewerId));
    let followingSet = new Set();
    if (privateIds.length) {
      const rows = await Follow.find({ follower: viewerId, following: { $in: privateIds } })
        .select("following")
        .lean();
      followingSet = new Set(rows.map((r) => String(r.following)));
    }
    const hide = new Set();
    for (const id of privateIds) {
      if (!followingSet.has(String(id))) hide.add(String(id));
    }
    // Deactivated: hide from everyone except self.
    for (const id of deactivatedSet) {
      if (String(id) !== String(viewerId)) hide.add(String(id));
    }
    return hide;
  },

  // Apply per-field academic visibility to a safe user object.
  // viewerId null = guest. isFollowing precomputed where available.
  applyProfileVisibility(safeUser, viewerId, isFollowing) {
    const isOwner = viewerId && String(viewerId) === String(safeUser._id);
    if (isOwner) return safeUser;
    const follows = Boolean(isFollowing);
    const vis = safeUser.profileVisibility || {};
    const out = { ...safeUser };
    for (const field of ["college", "course", "academicYear"]) {
      const level = vis[field] || "public";
      if (level === "hidden") {
        out[field] = null;
        if (field === "college") out.collegeSlug = null;
      } else if (level === "followers" && !follows) {
        out[field] = null;
        if (field === "college") out.collegeSlug = null;
      }
    }
    return out;
  },

  // Reply gate for global replyPolicy on the post author's settings.
  // Returns null when allowed, otherwise an AppError-style { status, code, message }.
  async replyGate(viewerId, author) {
    const policy = author?.replyPolicy || "everyone";
    if (String(viewerId) === String(author?._id || author)) return null;
    if (policy === "everyone") return null;
    if (policy === "none") {
      return { status: 403, code: "REPLIES_DISABLED", message: "This user does not allow replies." };
    }
    // followers
    const ok = await this.isFollowing(viewerId, author?._id || author);
    if (!ok) {
      return { status: 403, code: "REPLIES_FOLLOWERS_ONLY", message: "Only followers can reply to this account." };
    }
    return null;
  },

  // Mention gate: can actor mention mentionedUser?
  async mentionGate(actorId, mentionedUser) {
    if (!mentionedUser) return null;
    if (String(actorId) === String(mentionedUser._id)) return null;
    const policy = mentionedUser?.mentionPolicy || "everyone";
    if (policy === "everyone") return null;
    if (policy === "none") {
      return { status: 403, code: "MENTIONS_DISABLED", message: `You cannot mention @${mentionedUser.username}.` };
    }
    const ok = await this.isFollowing(actorId, mentionedUser._id);
    if (!ok) {
      return { status: 403, code: "MENTIONS_FOLLOWERS_ONLY", message: `Only followers can mention @${mentionedUser.username}.` };
    }
    return null;
  },
};
