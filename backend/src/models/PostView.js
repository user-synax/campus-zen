import mongoose from "mongoose";

// Per-user-per-day deduped view events.
// - One document = one viewer saw one post on one UTC day.
// - Unique index (post, viewer, dayKey) makes the insert the arbiter, so
//   refreshes / double-fires never inflate numbers (race-safe like Like).
// - Auth-only: guests are ignored (no viewer), per product decision.
// - viewCount on Post is the denormalized all-time total of these rows.
const postViewSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // UTC day bucket YYYY-MM-DD — dedup window + cheap 24h/7d range math.
    dayKey: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

postViewSchema.index({ post: 1, viewer: 1, dayKey: 1 }, { unique: true });
postViewSchema.index({ post: 1, createdAt: -1 });
postViewSchema.index({ viewer: 1, createdAt: -1 });

export const PostView = mongoose.model("PostView", postViewSchema);
