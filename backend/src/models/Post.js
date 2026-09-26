import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    imageUrl: { type: String, default: null },
    likeCount: { type: Number, default: 0, min: 0 },
    replyCount: { type: Number, default: 0, min: 0 },
    repostCount: { type: Number, default: 0, min: 0 },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
// for feed pagination
postSchema.index({ createdAt: -1, _id: -1 });
// text search for PRD §13 — optimized, lightweight
postSchema.index({ text: "text" });

export const Post = mongoose.model("Post", postSchema);
