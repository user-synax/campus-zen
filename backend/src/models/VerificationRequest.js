import mongoose from "mongoose";

export const VERIFICATION_STATUSES = ["open", "approved", "rejected"];
export const VERIFICATION_THRESHOLD_POSTS = 50;
export const VERIFICATION_THRESHOLD_FOLLOWERS = 100;
// 7-day cooldown after a rejection before re-appeal is allowed
export const VERIFICATION_REAPPEAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Merit-based blue-tick appeals: user needs 50+ posts OR 100+ followers
// (live User.postCount / followersCount). Admin reviews from /admin and
// manually grants User.isVerified.
const verificationRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: VERIFICATION_STATUSES, default: "open", index: true },
    // snapshot at request time for admin context (live counts re-fetched on review)
    postCount: { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 },
    message: { type: String, default: null, trim: true, maxlength: 500 },
    reviewNote: { type: String, default: null, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

verificationRequestSchema.index({ user: 1, status: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

export const VerificationRequest = mongoose.model("VerificationRequest", verificationRequestSchema);
