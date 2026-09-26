import { Block } from "../models/Block.js";
import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const blockService = {
  // true if a block exists in EITHER direction
  async isBlocked(a, b) {
    if (!a || !b || String(a) === String(b)) return false;
    const exists = await Block.exists({ $or: [{ blocker: a, blocked: b }, { blocker: b, blocked: a }] });
    return Boolean(exists);
  },

  // null when no block; otherwise which side the viewer is on
  async relationOf(viewerId, otherId) {
    if (!viewerId || !otherId || String(viewerId) === String(otherId)) return null;
    const doc = await Block.findOne({
      $or: [{ blocker: viewerId, blocked: otherId }, { blocker: otherId, blocked: viewerId }],
    })
      .select("blocker blocked")
      .lean();
    if (!doc) return null;
    return { isBlocker: String(doc.blocker) === String(viewerId) };
  },

  // every user id hidden from userId (both sides) — for feed/search/list filters
  async blockedIdsFor(userId) {
    if (!userId) return [];
    const docs = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] })
      .select("blocker blocked")
      .lean();
    return docs.map((d) => (String(d.blocker) === String(userId) ? d.blocked : d.blocker));
  },

  // throws 403 BLOCKED when any block exists between the two users
  async assertNoBlock(a, b, message = "You can't interact with this account.") {
    if (await this.isBlocked(a, b)) throw new AppError(message, 403, "BLOCKED");
  },

  async block(blockerId, blockedId) {
    if (String(blockerId) === String(blockedId)) throw new AppError("You cannot block yourself", 400, "SELF_BLOCK");
    const target = await User.findById(blockedId).select("_id");
    if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const existing = await Block.findOne({ blocker: blockerId, blocked: blockedId });
    if (existing) return { blocked: true }; // idempotent

    // remove follows in both directions and repair counts
    const rels = await Follow.find({
      $or: [{ follower: blockerId, following: blockedId }, { follower: blockedId, following: blockerId }],
    })
      .select("follower following")
      .lean();
    if (rels.length) {
      await Follow.deleteMany({ _id: { $in: rels.map((r) => r._id) } });
      const decFollowing = rels.filter((r) => String(r.follower) === String(blockerId)).length;
      const decFollowers = rels.filter((r) => String(r.following) === String(blockerId)).length;
      const decOtherFollowing = rels.length - decFollowing;
      const decOtherFollowers = rels.length - decFollowers;
      await Promise.all([
        User.findByIdAndUpdate(blockerId, { $inc: { followingCount: -decFollowing, followersCount: -decFollowers } }),
        User.findByIdAndUpdate(blockedId, { $inc: { followingCount: -decOtherFollowing, followersCount: -decOtherFollowers } }),
      ]);
      await User.updateMany({ _id: { $in: [blockerId, blockedId] }, followingCount: { $lt: 0 } }, { $set: { followingCount: 0 } });
      await User.updateMany({ _id: { $in: [blockerId, blockedId] }, followersCount: { $lt: 0 } }, { $set: { followersCount: 0 } });
    }

    await Block.create({ blocker: blockerId, blocked: blockedId });
    return { blocked: true };
  },

  async unblock(blockerId, blockedId) {
    await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
    return { blocked: false }; // idempotent
  },

  async listBlocked(userId) {
    const docs = await Block.find({ blocker: userId })
      .sort({ createdAt: -1 })
      .populate("blocked", "fullName username avatarUrl")
      .lean();
    return docs.map((d) => ({ ...(d.blocked || {}), blockedAt: d.createdAt }));
  },
};
