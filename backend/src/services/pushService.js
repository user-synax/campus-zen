import webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscription } from "../models/PushSubscription.js";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    configured = true;
    return true;
  } catch (err) {
    console.error("[push] invalid VAPID config:", err?.message);
    return false;
  }
}

const TYPE_COPY = {
  follow: "followed you",
  follow_request: "requested to follow you",
  follow_accept: "accepted your follow request",
  like: "liked your post",
  reply: "replied to your post",
  repost: "reposted your post",
  mention: "mentioned you",
  report_update: "update on your report",
  appeal_update: "update on your appeal",
};

function notifUrl(type, postId) {
  if (postId) return `/app/p/${postId}`;
  if (type?.startsWith("follow")) return `/app/notifications`;
  return `/app/notifications`;
}

export const pushService = {
  get publicKey() {
    return env.VAPID_PUBLIC_KEY || "";
  },

  isEnabled() {
    return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  },

  async upsertSubscription(userId, { endpoint, keys, device = {} }) {
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      const err = new Error("Invalid push subscription");
      err.statusCode = 400;
      err.code = "INVALID_SUBSCRIPTION";
      throw err;
    }
    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          user: userId,
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          "device.userAgent": String(device.userAgent || "").slice(0, 500),
          "device.platform": String(device.platform || "").slice(0, 100),
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return sub;
  },

  async removeSubscription(userId, endpoint) {
    if (!endpoint) return { deleted: 0 };
    const res = await PushSubscription.deleteOne({ user: userId, endpoint });
    return { deleted: res.deletedCount };
  },

  async removeAllForEndpoint(endpoint) {
    if (!endpoint) return;
    await PushSubscription.deleteMany({ endpoint });
  },

  async listForUser(userId) {
    return PushSubscription.find({ user: userId }).sort({ updatedAt: -1 }).lean();
  },

  async sendToUser(userId, payload) {
    if (!ensureConfigured()) return { sent: 0, removed: 0, skipped: true };
    const subs = await PushSubscription.find({ user: userId }).lean();
    if (subs.length === 0) return { sent: 0, removed: 0 };

    const body = JSON.stringify(payload);
    let sent = 0;
    const dead = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            body,
            { TTL: 28 * 24 * 3600, urgency: "normal" }
          );
          sent += 1;
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            dead.push(s.endpoint);
          }
        }
      })
    );

    let removed = 0;
    if (dead.length) {
      const res = await PushSubscription.deleteMany({ endpoint: { $in: dead } });
      removed = res.deletedCount || dead.length;
    }
    // Touch lastUsedAt for live endpoints (best-effort, no await chain break)
    PushSubscription.updateMany(
      { user: userId, endpoint: { $nin: dead } },
      { $set: { lastUsedAt: new Date() } }
    ).catch(() => {});
    return { sent, removed };
  },

  buildPayload({ type, actorName, actorUsername, postPreview, postId, notifId, unreadCount }) {
    const action = TYPE_COPY[type] || "sent you a notification";
    const title = actorName || "CampusZen";
    let body = `${actorUsername ? `@${actorUsername} ` : ""}${action}`;
    if (postPreview) {
      const snippet = String(postPreview).slice(0, 100);
      body = `${body}: ${snippet}`;
    }
    return {
      title,
      body: body.slice(0, 200),
      icon: "/campusZen.png",
      badge: "/icon.svg",
      tag: notifId ? String(notifId) : `${type}-${Date.now()}`,
      url: notifUrl(type, postId),
      type,
      notifId: notifId ? String(notifId) : null,
      unreadCount: unreadCount ?? null,
      timestamp: Date.now(),
    };
  },
};
