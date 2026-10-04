import mongoose from "mongoose";
import { env } from "../config/env.js";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    // optional profile fields per PRD §8
    avatarUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    accent: {
      type: String,
      default: null,
      enum: {
        values: ["peach", "lavender", "mint", "sky", "rose", null],
        message: "{VALUE} is not a supported accent",
      },
    },
    pinnedPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    bio: { type: String, default: null, maxlength: 160 },
    college: { type: String, default: null, trim: true },
    collegeSlug: { type: String, default: null, trim: true, lowercase: true, index: true },
    course: { type: String, default: null, trim: true }, // branch
    academicYear: {
      type: String,
      default: null,
      enum: {
        values: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduated", null],
        message: "{VALUE} is not supported",
      },
    },
    // social links — minimal: github (username only), x/twitter, linkedin, instagram
    socialLinks: {
      github: { type: String, default: null, trim: true, maxlength: 39 },
      twitter: { type: String, default: null, trim: true, maxlength: 30 },
      linkedin: { type: String, default: null, trim: true, maxlength: 100 },
      instagram: { type: String, default: null, trim: true, maxlength: 30 },
    },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },

    // ── Privacy & safety controls ──────────────────────────────────
    // Strict private: approval queue + followers-only visibility.
    isPrivate: { type: Boolean, default: false, index: true },
    // Global interaction defaults (per user answers: global only, no per-post).
    replyPolicy: {
      type: String,
      enum: ["everyone", "followers", "none"],
      default: "everyone",
    },
    mentionPolicy: {
      type: String,
      enum: ["everyone", "followers", "none"],
      default: "everyone",
    },
    // Per-field academic visibility: public | followers | hidden
    profileVisibility: {
      college: { type: String, enum: ["public", "followers", "hidden"], default: "public" },
      course: { type: String, enum: ["public", "followers", "hidden"], default: "public" },
      academicYear: { type: String, enum: ["public", "followers", "hidden"], default: "public" },
    },
    // Deactivation with 30-day grace before permanent purge.
    isDeactivated: { type: Boolean, default: false, index: true },
    deactivatedAt: { type: Date, default: null },
    scheduledDeletionAt: { type: Date, default: null, index: true },

    // dual-token: hashed refresh token (sha256 hex)
    refreshTokenHash: { type: String, default: null, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    // moderation — suspend/ban via admin dashboard
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedAt: { type: Date, default: null },
    suspendReason: { type: String, default: null, maxlength: 500 },
    // badge tiers — owner (red, exactly OWNER_EMAIL), cofounder (lavender,
    // exactly COFOUNDER_EMAIL), pro (gold, future subscription), verified
    // (blue, admin-granted via verification appeals). isOwner/isCofounder sync from email on save
    // so no email ever leaks to clients for badge checks.
    isPro: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false, index: true },
    isCofounder: { type: Boolean, default: false, index: true },
    // manual blue-tick — granted from /admin after appeal review.
    // Replaces the old isEmailVerified-driven badge.
    isVerified: { type: Boolean, default: false, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// text index for PRD §13 — username 10, fullName 5, bio/college/course 2 (weighted)
userSchema.index(
  { username: "text", fullName: "text", bio: "text", college: "text", course: "text" },
  { weights: { username: 10, fullName: 5, bio: 2, college: 2, course: 2 }, name: "user_text_search" }
);

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.__v;
  return obj;
};

// Owner + co-founder flags follow the email — single source of truth is
// OWNER_EMAIL / COFOUNDER_EMAIL, so clients never need the email address
// to decide the red / lavender badge.
userSchema.pre("save", function (next) {
  try {
    if (this.isNew || this.isModified("email")) {
      const clean = String(this.email || "").toLowerCase().trim();
      this.isOwner = clean === env.OWNER_EMAIL;
      this.isCofounder = clean === env.COFOUNDER_EMAIL;
    }
  } catch {}
  next();
});

export const User = mongoose.model("User", userSchema);
