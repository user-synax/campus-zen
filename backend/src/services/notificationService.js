import { Notification } from "../models/Notification.js";
import { blockService } from "./blockService.js";
import { pushNotification, pushUnreadCount } from "../routes/sseRoutes.js";
import { User } from "../models/User.js";
import { Post } from "../models/Post.js";

// Burst coalesce window: same (recipient, actor, type, post) within 10s
// collapses without DB. Pruned opportunistically to bound memory.
const recentCreates = new Map();
setInterval(() => {
  const cutoff = Date.now() - 10_000;
  for (const [k, t] of recentCreates) {
    if (t < cutoff) recentCreates.delete(k);
  }
}, 30_000).unref?.();

export const notificationService = {
  async create({ recipient, actor, type, post = null }) {
    if (String(recipient) === String(actor)) return null; // no self-notif
    // never notify across a block — either direction
    if (await blockService.isBlocked(recipient, actor)) return null;
    // In-memory burst coalesce (10s): 100 concurrent likes from distinct
    // actors have distinct keys so all pass; duplicate retries / double-taps
    // from the same actor collapse without a DB hit.
    const key = `${recipient}:${actor}:${type}:${post || ""}`;
    const now = Date.now();
    const last = recentCreates.get(key);
    if (last && now - last < 10_000) return null;
    recentCreates.set(key, now);
    // dedup: ignore if same unread exists within 1h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await Notification.findOne({
      recipient,
      actor,
      type,
      post: post || null,
      read: false,
      createdAt: { $gte: oneHourAgo },
    });
    if (existing) return existing;
    const notif = await Notification.create({ recipient, actor, type, post: post || null });
    // Push real-time event via SSE
    const unreadCount = await Notification.countDocuments({ recipient, read: false });
    pushNotification(recipient, {
      _id: notif._id,
      actor: notif.actor,
      type: notif.type,
      post: notif.post,
      read: false,
      createdAt: notif.createdAt,
    });
    pushUnreadCount(recipient, unreadCount);
    // Fire-and-forget OS-level push (works when app is closed).
    // Never blocks or fails the notification write.
    setImmediate(() => {
      import("./pushService.js")
        .then(async ({ pushService }) => {
          if (!pushService.isEnabled()) return;
          const [actorDoc, postDoc] = await Promise.all([
            User.findById(actor).select("fullName username").lean(),
            post ? Post.findById(post).select("text").lean() : null,
          ]);
          const payload = pushService.buildPayload({
            type,
            actorName: actorDoc?.fullName || "CampusZen",
            actorUsername: actorDoc?.username || "",
            postPreview: postDoc?.text || "",
            postId: post ? String(post) : null,
            notifId: notif._id,
            unreadCount,
          });
          await pushService.sendToUser(recipient, payload);
        })
        .catch(() => {});
    });
    return notif;
  },

  async list(recipientId, { page = 1, limit = 20, filter = "all", type }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const pg = Math.max(1, Number(page));
    const skip = (pg - 1) * lim;
    const query = { recipient: recipientId };
    if (filter === "unread") query.read = false;
    if (type && type !== "all") query.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("actor", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
        .populate("post", "text")
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: recipientId, read: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: pg,
      limit: lim,
      hasMore: skip + lim < total,
    };
  },

  async getUnreadCount(recipientId) {
    const count = await Notification.countDocuments({ recipient: recipientId, read: false });
    return { count };
  },

  async markRead(recipientId, notifId) {
    const notif = await Notification.findOne({ _id: notifId, recipient: recipientId });
    if (!notif) {
      const err = new Error("Notification not found");
      err.statusCode = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    if (notif.read) return notif;
    notif.read = true;
    await notif.save();
    // Push updated unread count via SSE
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, read: false });
    pushUnreadCount(recipientId, unreadCount);
    return notif;
  },

  async markAllRead(recipientId) {
    await Notification.updateMany({ recipient: recipientId, read: false }, { $set: { read: true } });
    // Push updated unread count via SSE
    pushUnreadCount(recipientId, 0);
    return { message: "All marked as read" };
  },

  async deleteOne(recipientId, notifId) {
    const res = await Notification.deleteOne({ _id: notifId, recipient: recipientId });
    if (res.deletedCount === 0) {
      const err = new Error("Notification not found");
      err.statusCode = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    return { message: "Notification deleted" };
  },

  async clearRead(recipientId) {
    const res = await Notification.deleteMany({ recipient: recipientId, read: true });
    return { message: "Read notifications cleared", deleted: res.deletedCount };
  },
};
