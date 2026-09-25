import mongoose from "mongoose";
import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { AppError } from "../utils/AppError.js";

export const followService = {
  async follow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot follow yourself", 400, "SELF_FOLLOW");
    const target = await User.findById(followingId);
    if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const existing = await Follow.findOne({ follower: followerId, following: followingId });
    if (existing) throw new AppError("Already following", 409, "ALREADY_FOLLOWING");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Follow.create([{ follower: followerId, following: followingId }], { session });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }, { session });
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }, { session });
      // notification — best effort, outside transaction to avoid session lock, with dedup
      try {
        await notificationService.create({ recipient: followingId, actor: followerId, type: "follow" });
      } catch {}
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      if (err.code === 11000) throw new AppError("Already following", 409, "ALREADY_FOLLOWING");
      throw err;
    } finally {
      session.endSession();
    }

    // live counts — fetch fresh
    const [follower, following] = await Promise.all([
      User.findById(followerId).select("followingCount followersCount"),
      User.findById(followingId).select("followingCount followersCount"),
    ]);
    return { followerCounts: follower, followingCounts: following };
  },

  async unfollow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot unfollow yourself", 400, "SELF_FOLLOW");
    const existing = await Follow.findOne({ follower: followerId, following: followingId });
    if (!existing) throw new AppError("Not following", 404, "NOT_FOLLOWING");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Follow.deleteOne({ _id: existing._id }, { session });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }, { session });
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }, { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

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
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const filter = { following: userId };

    const [rows, total] = await Promise.all([
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("follower", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified").lean(),
      Follow.countDocuments(filter),
    ]);

    // add isFollowing flag for viewer
    let followingSet = new Set();
    if (viewerId && rows.length) {
      const ids = rows.map((r) => r.follower._id);
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }

    const users = rows.map((r) => ({
      ...r.follower,
      isFollowing: followingSet.has(String(r.follower._id)),
      followedAt: r.createdAt,
    }));

    return { users, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  async getFollowing(userId, { page = 1, limit = 20, viewerId }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const filter = { follower: userId };

    const [rows, total] = await Promise.all([
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("following", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified").lean(),
      Follow.countDocuments(filter),
    ]);

    let followingSet = new Set();
    if (viewerId && rows.length) {
      const ids = rows.map((r) => r.following._id);
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }

    const users = rows.map((r) => ({
      ...r.following,
      isFollowing: followingSet.has(String(r.following._id)),
      followedAt: r.createdAt,
    }));

    return { users, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },
};
