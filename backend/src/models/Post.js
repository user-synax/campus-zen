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
    hashtags: { type: [String], default: [], index: true },
    mentions: { type: [String], default: [], index: true },
    // poll attachment (V1) — counts denormalized here so feeds never aggregate.
    // Per-user votes live in PollVote; expiry is computed (no cron on free tier).
    poll: {
      type: {
        options: {
          type: [
            {
              text: { type: String, required: true, trim: true, maxlength: 80 },
              votes: { type: Number, default: 0, min: 0 },
              _id: false,
            },
          ],
          validate: {
            validator: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 4,
            message: "Poll needs 2-4 options",
          },
        },
        totalVotes: { type: Number, default: 0, min: 0 },
        expiresAt: { type: Date, required: true },
      },
      default: null,
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
// for feed pagination
postSchema.index({ createdAt: -1, _id: -1 });
// for hashtag feeds
postSchema.index({ hashtags: 1, createdAt: -1 });
// text search for PRD §13 — optimized, lightweight
postSchema.index({ text: "text" });

export const Post = mongoose.model("Post", postSchema);
