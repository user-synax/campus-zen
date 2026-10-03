import mongoose from "mongoose";

export const APPEAL_TYPES = ["report", "suspension", "post_removal"];
export const APPEAL_STATUSES = ["open", "upheld", "rejected"];

// Appeals against moderation actions: a dismissed/actioned report decision,
// a suspension, or a post removal. Linked to the original report when known.
const appealSchema = new mongoose.Schema(
  {
    appellant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: APPEAL_TYPES, required: true, index: true },
    report: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null, index: true },
    // For suspension appeals: the suspended user id. For post_removal: post id.
    // Stored as ObjectId when it parses, else raw string fallback is avoided —
    // callers pass valid ObjectIds.
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: APPEAL_STATUSES, default: "open", index: true },
    reviewNote: { type: String, default: null, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ appellant: 1, createdAt: -1 });

export const Appeal = mongoose.model("Appeal", appealSchema);
