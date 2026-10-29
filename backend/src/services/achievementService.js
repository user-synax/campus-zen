import mongoose from "mongoose";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { cache, CacheKeys } from "../utils/cache.js";
import {
  computeAchievementTier,
  tierInfo,
  progressToNext,
} from "../utils/achievements.js";

function isActiveRecently(user) {
  const ref = user?.lastLoginAt || user?.updatedAt || user?.createdAt;
  if (!ref) return true;
  const ms = Date.now() - new Date(ref).getTime();
  return ms <= 7 * 24 * 60 * 60 * 1000;
}

export const achievementService = {
  async statsFor(userId) {
    const user = await User.findById(userId)
      .select("postCount followersCount avatarUrl bio college lastLoginAt updatedAt createdAt achievementTier username isMinor")
      .lean();
    if (!user) return null;
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
    return { user, activeRecently: active, qualityFollowers };
  },

  async evaluate(userId) {
    const stats = await this.statsFor(userId);
    if (!stats) return { changed: false, tier: 0 };
    const { user, activeRecently } = stats;
    // DPDP s.9: badge progression is behavioural monitoring; do not run it for
    // children. Existing tier is left untouched.
    if (user.isMinor) return { changed: false, tier: Number(user.achievementTier) || 0, disabled: true };
    const next = computeAchievementTier({ user, activeRecently });
    const prev = Number(user.achievementTier) || 0;
    if (next <= prev) {
      return { changed: false, tier: prev };
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
    return { changed: true, tier: next, previous: prev };
  },

  async getProgress(userId) {
    const stats = await this.statsFor(userId);
    if (!stats) return null;
    const { user, activeRecently } = stats;
    if (user.isMinor) {
      return { disabled: true, reason: "Badge progression is disabled for under-18 accounts." };
    }
    return progressToNext({ user, activeRecently });
  },
};
