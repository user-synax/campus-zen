import mongoose from "mongoose";

// Append-only evidence of consent. User.consent holds the *current* state;
// this collection preserves the history of what was accepted, when, by whom
// (self or guardian), and from which request. DPDP places the burden of
// proving notice and consent on the Data Fiduciary, so this is the record
// that answers that question.
const consentRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    policyVersion: { type: String, required: true },
    termsVersion: { type: String, default: null },
    privacyVersion: { type: String, default: null },
    purposes: {
      type: [{ type: String, enum: ["core", "analytics"] }],
      default: ["core"],
    },
    action: { type: String, enum: ["granted", "withdrawn"], required: true },
    method: { type: String, enum: ["self", "guardian"], default: "self" },
    guardianName: { type: String, default: null, maxlength: 80 },
    guardianEmail: { type: String, default: null, maxlength: 254 },
    ip: { type: String, default: null, maxlength: 64 },
    userAgent: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

consentRecordSchema.index({ user: 1, createdAt: -1 });

export const ConsentRecord = mongoose.model("ConsentRecord", consentRecordSchema);
