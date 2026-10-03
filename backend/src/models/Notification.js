import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["follow", "like", "reply", "repost", "mention", "follow_request", "follow_accept", "report_update", "appeal_update"], required: true },
    read: { type: Boolean, default: false, index: true },
    // optional references for post-related notifications (future)
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, actor: 1, type: 1, post: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
