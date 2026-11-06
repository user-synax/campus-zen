import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "A conversation must have exactly two participants",
      },
      required: true,
    },
    participantKey: { type: String, required: true, unique: true, index: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageAt: { type: Date, default: null, index: true },
    unreadCounts: {
      type: Map,
      of: { type: Number, min: 0 },
      default: {},
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
