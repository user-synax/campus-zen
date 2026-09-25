import mongoose from "mongoose";

const repostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  },
  { timestamps: true }
);

repostSchema.index({ user: 1, post: 1 }, { unique: true });
repostSchema.index({ post: 1, createdAt: -1 });
repostSchema.index({ user: 1, createdAt: -1 });

export const Repost = mongoose.model("Repost", repostSchema);
