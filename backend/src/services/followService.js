import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { blockService } from "./blockService.js";
import { AppError } from "../utils/AppError.js";

export const followService = {
  async follow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot follow yourself", 400, "SELF_FOLLOW");
    const target = await User.findById(followingId).select("_id");
    if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    await blockService.assertNoBlock(followerId, followingId, "You can't follow this account.");

    // No transaction on purpose: must run on standalone local Mongo as well
    // as replica sets. The unique index makes the insert retry-safe.
    try {
      await Follow.create({ follower: followerId, following: followingId });
    } catch (err) {
      if (err.code === 11000) throw new AppError("Already following", 409, "ALREADY_FOLLOWING");
      throw err;
    }
    // denormalized counts — best effort, Follow docs are the source of truth
    await Promise.all([
      User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);
    // notification — best effort with dedup
    try {
      await notificationService.create({ recipient: followingId, actor: followerId, type: "follow" });
    } catch {}

    // live counts — fetch fresh
    const [follower, following] = await Promise.all([
      User.findById(followerId).select("followingCount followersCount"),
      User.findById(followingId).select("followingCount followersCount"),
    ]);
    return { followerCounts: follower, followingCounts: following };
  },

  async unfollow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot unfollow yourself", 400, "SELF_FOLLOW");
    // atomic delete — doubles as the existence check, no transaction needed
    const existing = await Follow.findOneAndDelete({ follower: followerId, following: followingId });
    if (!existing) throw new AppError("Not following", 404, "NOT_FOLLOWING");

    await Promise.all([
      User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
    ]);

    // clamp counts to 0 and return live
    await User.updateMany({ _id: { $in: [followerId, followingId] }, followingCount: { $lt: 0 } }, { $set: { followingCount: 0 } });
    await User.updateMany({ _id: { $in: [followerId, followingId] }, followersCount: { $lt: 0 } }, { $set: { followersCount: 0 } });

    const [follower, following] = await Promise.all([
      User.findById(followerId).select("followingCount followersCount"),
      User.findById(followingId).select("followingCount followersCount"),
    ]);
    return { followerCounts: follower, followingCounts: following };
  },

  async isFollowing(followerId, followingId) {
    if (!followerId || !followingId) return false;
    const exists = await Follow.exists({ follower: followerId, following: followingId });
    return Boolean(exists);
  },

  async getFollowers(userId, { page = 1, limit = 20, viewerId }) {
    if (viewerId && (await blockService.isBlocked(viewerId, userId))) {
      throw new AppError("You can't view this.", 403, "BLOCKED");
    }
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const filter = { following: userId };

    const [rows, total] = await Promise.all([
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("follower", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified").lean(),
      Follow.countDocuments(filter),
    ]);

    // add isFollowing flag for viewer
    let followingSet = new Set();
    // hide users on either side of a block with the viewer
    let visible = rows;
    if (viewerId && rows.length) {
      const hidden = new Set((await blockService.blockedIdsFor(viewerId)).map(String));
      if (hidden.size) visible = rows.filter((r) => !hidden.has(String(r.follower._id)));
    }
    if (viewerId && visible.length) {
      const ids = visible.map((r) => r.follower._id);
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }

    const users = visible.map((r) => ({
      ...r.follower,
      isFollowing: followingSet.has(String(r.follower._id)),
      followedAt: r.createdAt,
    }));

    return { users, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  async getFollowing(userId, { page = 1, limit = 20, viewerId }) {
    if (viewerId && (await blockService.isBlocked(viewerId, userId))) {
      throw new AppError("You can't view this.", 403, "BLOCKED");
    }
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const filter = { follower: userId };

    const [rows, total] = await Promise.all([
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("following", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified").lean(),
      Follow.countDocuments(filter),
    ]);

    // hide users on either side of a block with the viewer
    let visible = rows;
    if (viewerId && rows.length) {
      const hidden = new Set((await blockService.blockedIdsFor(viewerId)).map(String));
      if (hidden.size) visible = rows.filter((r) => !hidden.has(String(r.following._id)));
    }

    let followingSet = new Set();
    if (viewerId && visible.length) {
      const ids = visible.map((r) => r.following._id);
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }

    const users = visible.map((r) => ({
      ...r.following,
      isFollowing: followingSet.has(String(r.following._id)),
      followedAt: r.createdAt,
    }));

    return { users, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },
};
