import { Notification } from "../models/Notification.js";
import { blockService } from "./blockService.js";

export const notificationService = {
  async create({ recipient, actor, type, post = null }) {
    if (String(recipient) === String(actor)) return null; // no self-notif
    // never notify across a block — either direction
    if (await blockService.isBlocked(recipient, actor)) return null;
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
    return notif;
  },

  async list(recipientId, { page = 1, limit = 20, filter = "all" }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const pg = Math.max(1, Number(page));
    const skip = (pg - 1) * lim;
    const query = { recipient: recipientId };
    if (filter === "unread") query.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("actor", "fullName username avatarUrl")
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
    return notif;
  },

  async markAllRead(recipientId) {
    await Notification.updateMany({ recipient: recipientId, read: false }, { $set: { read: true } });
    return { message: "All marked as read" };
  },
};
