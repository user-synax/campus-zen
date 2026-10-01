import mongoose from "mongoose";

const pollVoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    optionIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { timestamps: true }
);

pollVoteSchema.index({ post: 1, user: 1 }, { unique: true });
pollVoteSchema.index({ post: 1, createdAt: -1 });

export const PollVote = mongoose.model("PollVote", pollVoteSchema);
