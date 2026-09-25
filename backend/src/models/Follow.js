import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// prevent duplicate follows — fast via unique index
followSchema.index({ follower: 1, following: 1 }, { unique: true });
// for listing followers/following efficiently
followSchema.index({ follower: 1, createdAt: -1 });
followSchema.index({ following: 1, createdAt: -1 });

export const Follow = mongoose.model("Follow", followSchema);
