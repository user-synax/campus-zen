import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// one block per pair, enforced fast via unique index
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.model("Block", blockSchema);
