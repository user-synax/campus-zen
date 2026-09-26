import mongoose from "mongoose";

export const REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "misinformation", "other"];
export const REPORT_STATUSES = ["open", "dismissed", "actioned"];

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["post", "user"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 500, default: null },
    status: { type: String, enum: REPORT_STATUSES, default: "open", index: true },
  },
  { timestamps: true }
);

// one open report per reporter+target — prevents pile-ons
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
