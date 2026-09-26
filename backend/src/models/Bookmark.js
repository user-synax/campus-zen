import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
