import mongoose from "mongoose";

// One row per announcement sent from /admin. The individual in-app copies
// live in Notification (type: "admin_broadcast"); this is the audit trail and
// powers the "Recent broadcasts" history in the admin panel.
const adminBroadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    audience: { type: String, enum: ["all", "selected"], default: "all" },
    // Selected recipients only. "all" stores the count and a small sample so
    // the document never grows with the user table.
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    recipientCount: { type: Number, default: 0, min: 0 },
    recipientSample: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pushSubscriberCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

adminBroadcastSchema.index({ createdAt: -1 });

export const AdminBroadcast = mongoose.model("AdminBroadcast", adminBroadcastSchema);
