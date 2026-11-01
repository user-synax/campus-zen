import mongoose from "mongoose";

/**
 * College-level moderation roles — separate from the platform /admin console.
 *
 * The platform owner (usersynax — isOwner) is implicitly every college's
 * admin. Beyond that, the owner can grant any joined user a scoped role on a
 * specific college with three capability switches:
 *
 *   kick           — remove a member from the college (they may re-claim it)
 *   ban            — blacklist a member from the college (no re-claim)
 *   moderatePosts  — delete posts written by the college's members
 *
 * Caps live in the database (never in the JWT) so an owner toggle takes
 * effect on the very next request, without waiting for a token refresh.
 */
export const COLLEGE_ADMIN_CAPS = ["kick", "ban", "moderatePosts"];

const collegeAdminSchema = new mongoose.Schema(
  {
    collegeSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // All three default false: assignment grants the title, the owner
    // decides the powers. Zero powers means the role renders but cannot act.
    caps: {
      kick: { type: Boolean, default: false },
      ban: { type: Boolean, default: false },
      moderatePosts: { type: Boolean, default: false },
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One role per (college, user) — re-assigning updates the existing doc.
collegeAdminSchema.index({ collegeSlug: 1, user: 1 }, { unique: true });

export const CollegeAdmin = mongoose.model("CollegeAdmin", collegeAdminSchema);
