import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Post } from "../models/Post.js";
import { notificationService } from "./notificationService.js";
import { cache, CacheKeys } from "../utils/cache.js";
import {
  computeAchievementTier,
  tierInfo,
  progressToNext,
} from "../utils/achievements.js";

async function totalLikesFor(userId) {
  try {
    const rows = await Post.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(String(userId)) } },
      { $group: { _id: null, total: { $sum: "$likeCount" } } },
    ]);
    return rows?.[0]?.total || 0;
  } catch {
    return 0;
  }
}

function isActiveRecently(user) {
  const ref = user?.lastLoginAt || user?.updatedAt || user?.createdAt;
  if (!ref) return true;
  const ms = Date.now() - new Date(ref).getTime();
  return ms <= 7 * 24 * 60 * 60 * 1000;
}

export const achievementService = {
  async statsFor(userId) {
    const user = await User.findById(userId)
      .select("postCount followersCount avatarUrl bio college lastLoginAt updatedAt createdAt achievementTier username")
      .lean();
    if (!user) return null;
    const likes = await totalLikesFor(userId);
    const active = isActiveRecently(user);
    // Engagement quality: only followers active in the last 30 days count toward
    // badge thresholds, so dead/fake followers can't farm tiers.
    let qualityFollowers = Number(user.followersCount) || 0;
    try {
      const { Follow } = await import("../models/Follow.js");
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const rows = await Follow.aggregate([
        { $match: { following: new mongoose.Types.ObjectId(String(userId)) } },
        {
          $lookup: {
            from: "users",
            localField: "follower",
            foreignField: "_id",
            as: "followerDoc",
          },
        },
        { $unwind: "$followerDoc" },
        { $match: { "followerDoc.lastLoginAt": { $gte: since } } },
        { $count: "n" },
      ]);
      if (rows?.[0]?.n != null) qualityFollowers = rows[0].n;
    } catch {}
    // Attach so computeAchievementTier can use it.
    user.qualityFollowers = qualityFollowers;
    return { user, totalLikes: likes, activeRecently: active, qualityFollowers };
  },

  async evaluate(userId) {
    const stats = await this.statsFor(userId);
    if (!stats) return { changed: false, tier: 0 };
    const { user, totalLikes, activeRecently } = stats;
    const next = computeAchievementTier({ user, totalLikes, activeRecently });
    const prev = Number(user.achievementTier) || 0;
    if (next <= prev) {
      return { changed: false, tier: prev, totalLikes };
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { achievementTier: next } },
      { new: true },
    );
    if (updated) {
      cache.del(CacheKeys.userProfile(updated.username));
      cache.delPattern("user:*");
    }
    // Notify + celebrate.
    try {
      const info = tierInfo(next);
      await notificationService.createBadgeUnlock(userId, next, info?.name || "badge");
    } catch {}
    return { changed: true, tier: next, previous: prev, totalLikes };
  },

  async getProgress(userId) {
    const stats = await this.statsFor(userId);
    if (!stats) return null;
    const { user, totalLikes, activeRecently } = stats;
    const prog = progressToNext({ user, totalLikes, activeRecently });
    // attach totalLikes for client convenience
    return { ...prog, totalLikes };
  },
};
