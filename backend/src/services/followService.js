import { Follow } from "../models/Follow.js";
import { FollowRequest } from "../models/FollowRequest.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { blockService } from "./blockService.js";
import { AppError } from "../utils/AppError.js";
import { pushFollowUpdate } from "../routes/sseRoutes.js";
import { cache } from "../utils/cache.js";

function afterResponse(fn) {
  setImmediate(() => {
    Promise.resolve()
      .then(fn)
      .catch(() => {});
  });
}

export const followService = {
  async follow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot follow yourself", 400, "SELF_FOLLOW");
    const target = await User.findById(followingId).select("_id isPrivate isDeactivated");
    if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (target.isDeactivated) throw new AppError("This account is unavailable.", 404, "USER_NOT_FOUND");
    await blockService.assertNoBlock(followerId, followingId, "You can't follow this account.");

    // Strict private: create an approval request instead of a follow.
    if (target.isPrivate) {
      const already = await Follow.exists({ follower: followerId, following: followingId });
      if (already) {
        const [follower, following] = await Promise.all([
          User.findById(followerId).select("followingCount followersCount"),
          User.findById(followingId).select("followingCount followersCount"),
        ]);
        return { followerCounts: follower, followingCounts: following, alreadyFollowing: true, requested: false };
      }
      const pending = await FollowRequest.findOne({ requester: followerId, target: followingId, status: "pending" });
      if (pending) return { requested: true, requestId: pending._id };
      await FollowRequest.create({ requester: followerId, target: followingId, status: "pending" });
      cache.delPattern("user:*");
      afterResponse(() =>
        notificationService.create({ recipient: followingId, actor: followerId, type: "follow_request" }),
      );
      return { requested: true };
    }

    // Public account: any stale pending request is fulfilled by the follow.
    await FollowRequest.deleteMany({ requester: followerId, target: followingId, status: { $in: ["pending", "declined"] } });

    // No transaction on purpose: must run on standalone local Mongo as well
    // as replica sets. The unique index makes the insert retry-safe.
    // Idempotent: duplicate POST returns current counts instead of 409 so
    // burst retries / double-taps don't error.
    let inserted = true;
    try {
      await Follow.create({ follower: followerId, following: followingId });
    } catch (err) {
      if (err.code === 11000) inserted = false;
      else throw err;
    }
    if (inserted) {
      // denormalized counts — best effort, Follow docs are the source of truth
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
      ]);
      // notification + live push — never block the response
      afterResponse(() =>
        notificationService.create({ recipient: followingId, actor: followerId, type: "follow" }),
      );
    }

    // live counts — fetch fresh
    const [follower, following] = await Promise.all([
      User.findById(followerId).select("followingCount followersCount"),
      User.findById(followingId).select("followingCount followersCount"),
    ]);
    afterResponse(() =>
      pushFollowUpdate(followingId, {
        userId: String(followingId),
        followersCount: following.followersCount,
        isFollowing: true,
      }),
    );
    return { followerCounts: follower, followingCounts: following, alreadyFollowing: !inserted };
  },

  async unfollow(followerId, followingId) {
    if (String(followerId) === String(followingId)) throw new AppError("You cannot unfollow yourself", 400, "SELF_FOLLOW");
    // atomic delete — doubles as the existence check, no transaction needed
    // Idempotent: already-unfollowed returns current counts instead of 404.
    const existing = await Follow.findOneAndDelete({ follower: followerId, following: followingId });
    // Cancelling a pending request is also an "unfollow" for private accounts.
    const cancelled = await FollowRequest.deleteOne({ requester: followerId, target: followingId, status: "pending" });

    if (existing) {
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
      ]);

      // clamp counts to 0 and return live
      await User.updateMany({ _id: { $in: [followerId, followingId] }, followingCount: { $lt: 0 } }, { $set: { followingCount: 0 } });
      await User.updateMany({ _id: { $in: [followerId, followingId] }, followersCount: { $lt: 0 } }, { $set: { followersCount: 0 } });
    }

    const [follower, following] = await Promise.all([
      User.findById(followerId).select("followingCount followersCount"),
      User.findById(followingId).select("followingCount followersCount"),
    ]);
    afterResponse(() =>
      pushFollowUpdate(followingId, {
        userId: String(followingId),
        followersCount: following?.followersCount ?? 0,
        isFollowing: false,
      }),
    );
    return { followerCounts: follower, followingCounts: following, wasFollowing: Boolean(existing), cancelledRequest: cancelled.deletedCount > 0 };
  },

  async hasPendingRequest(requesterId, targetId) {
    if (!requesterId || !targetId) return null;
    return FollowRequest.findOne({ requester: requesterId, target: targetId, status: "pending" }).lean();
  },

  async incomingRequests(userId, { page = 1, limit = 20 } = {}) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = { target: userId, status: "pending" };
    const [rows, total] = await Promise.all([
      FollowRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("requester", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified isVerified isPro isOwner isCofounder")
        .lean(),
      FollowRequest.countDocuments(filter),
    ]);
    return { requests: rows, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async outgoingRequests(userId, { page = 1, limit = 20 } = {}) {
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const filter = { requester: userId, status: "pending" };
    const [rows, total] = await Promise.all([
      FollowRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("target", "fullName username avatarUrl bio isPrivate")
        .lean(),
      FollowRequest.countDocuments(filter),
    ]);
    return { requests: rows, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async acceptRequest(userId, requestId) {
    const req = await FollowRequest.findById(requestId);
    if (!req || String(req.target) !== String(userId)) throw new AppError("Request not found", 404, "REQUEST_NOT_FOUND");
    if (req.status !== "pending") throw new AppError("Request already handled", 409, "REQUEST_HANDLED");
    await blockService.assertNoBlock(req.requester, req.target, "You can't accept this request.");
    req.status = "accepted";
    await req.save();
    // Create the follow (idempotent via unique index).
    let inserted = true;
    try {
      await Follow.create({ follower: req.requester, following: req.target });
    } catch (err) {
      if (err.code === 11000) inserted = false;
      else throw err;
    }
    if (inserted) {
      await Promise.all([
        User.findByIdAndUpdate(req.requester, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(req.target, { $inc: { followersCount: 1 } }),
      ]);
      afterResponse(() =>
        notificationService.create({ recipient: req.requester, actor: req.target, type: "follow_accept" }),
      );
    }
    cache.delPattern("user:*");
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    return { accepted: true };
  },

  async declineRequest(userId, requestId) {
    const req = await FollowRequest.findById(requestId);
    if (!req || String(req.target) !== String(userId)) throw new AppError("Request not found", 404, "REQUEST_NOT_FOUND");
    if (req.status !== "pending") throw new AppError("Request already handled", 409, "REQUEST_HANDLED");
    req.status = "declined";
    await req.save();
    return { declined: true };
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
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("follower", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified isVerified isPro isOwner isCofounder").lean(),
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
      Follow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("following", "fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified isVerified isPro isOwner isCofounder").lean(),
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
