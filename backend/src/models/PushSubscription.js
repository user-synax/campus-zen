import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    device: {
      userAgent: { type: String, default: "" },
      platform: { type: String, default: "" },
    },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1, createdAt: -1 });
pushSubscriptionSchema.index({ updatedAt: 1 });

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
