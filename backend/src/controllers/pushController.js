import { pushService } from "../services/pushService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const pushController = {
  publicKey: asyncHandler(async (req, res) => {
    const key = pushService.publicKey;
    if (!key) {
      return res.status(503).json({ success: false, message: "Push not configured" });
    }
    res.json({ success: true, data: { publicKey: key } });
  }),

  subscribe: asyncHandler(async (req, res) => {
    const { endpoint, keys, device } = req.body || {};
    const sub = await pushService.upsertSubscription(req.user._id, {
      endpoint,
      keys,
      device: {
        userAgent: device?.userAgent || req.headers["user-agent"] || "",
        platform: device?.platform || "",
      },
    });
    res.status(201).json({ success: true, data: { id: sub._id } });
  }),

  unsubscribe: asyncHandler(async (req, res) => {
    const { endpoint } = req.body || {};
    const result = await pushService.removeSubscription(req.user._id, endpoint);
    res.json({ success: true, data: result });
  }),

  list: asyncHandler(async (req, res) => {
    const subs = await pushService.listForUser(req.user._id);
    res.json({
      success: true,
      data: {
        subscriptions: subs.map((s) => ({
          id: s._id,
          endpoint: `${s.endpoint.slice(0, 48)}…`,
          platform: s.device?.platform || "",
          updatedAt: s.updatedAt,
        })),
        count: subs.length,
      },
    });
  }),
};
