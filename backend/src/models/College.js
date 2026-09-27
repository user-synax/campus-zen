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
  },
  { timestamps: true }
);

collegeSchema.index({ name: "text" });

export const College = mongoose.model("College", collegeSchema);
