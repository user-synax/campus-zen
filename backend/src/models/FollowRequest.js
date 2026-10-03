import mongoose from "mongoose";

export const FOLLOW_REQUEST_STATUSES = ["pending", "accepted", "declined"];

// Approval queue for strict-private accounts.
// requester wants to follow target; target approves/declines.
const followRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: FOLLOW_REQUEST_STATUSES, default: "pending", index: true },
  },
  { timestamps: true }
);

// One live row per pair — re-request after decline creates a fresh pending row
// only if no pending row exists (enforced in service; unique index guards races).
followRequestSchema.index({ requester: 1, target: 1, status: 1 });
followRequestSchema.index({ target: 1, status: 1, createdAt: -1 });
followRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });

export const FollowRequest = mongoose.model("FollowRequest", followRequestSchema);
