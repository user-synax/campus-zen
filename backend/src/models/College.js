import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    memberCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },
    // Permanently blacklisted members. A banned user's profile claim of this
    // college is rejected at every assignment path and they cannot re-join.
    bannedUserIds: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

collegeSchema.index({ name: "text" });

export const College = mongoose.model("College", collegeSchema);
