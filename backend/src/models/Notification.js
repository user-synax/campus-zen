import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Null for system / admin messages — there is no user actor behind them.
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: [
        "follow",
        "like",
        "reply",
        "repost",
        "mention",
        "follow_request",
        "follow_accept",
        "report_update",
        "appeal_update",
        "admin_broadcast",
        "admin_notice",
      ],
      required: true,
    },
    read: { type: Boolean, default: false, index: true },
    // optional references for post-related notifications (future)
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    // Admin messages carry their own copy; regular notifications derive copy
    // from type + actor on the client.
    title: { type: String, default: null, maxlength: 120 },
    body: { type: String, default: null, maxlength: 1000 },
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: "AdminBroadcast", default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, actor: 1, type: 1, post: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
