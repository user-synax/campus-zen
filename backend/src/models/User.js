import mongoose from "mongoose";
import { env } from "../config/env.js";

const customLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 24 },
    url: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

// Account standing shown to the owner on /menu and set from the admin
// dashboard. "good" is the default; the rest are moderation decisions.
export const ACCOUNT_STATUSES = ["good", "limited", "restricted", "suspended", "banned"];

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
    // Cosmetic profile treatments. Pro-only values are gated in
    // config/perks.js; null means the default (flat banner, classic handle).
    profileTheme: {
      type: String,
      default: null,
      enum: {
        values: ["flat", "haze", "grid", "noir", null],
        message: "{VALUE} is not a supported profile theme",
      },
    },
    handleStyle: {
      type: String,
      default: null,
      enum: {
        values: ["classic", "bold", "mono", null],
        message: "{VALUE} is not a supported handle style",
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
    // Up to three labelled HTTPS links (portfolio, LeetCode, personal site).
    // Validated in userService; kept as a subdocument array so the profile
    // payload stays self-describing and exportable.
    customLinks: {
      type: [customLinkSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 3,
        message: "At most 3 custom links are allowed",
      },
    },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },
    // Highest achievement tier unlocked (0 = none, 1..9 = bronze..gold-3).
    // Derived from posts/followers/likes/profile completeness; kept denormalized
    // so feeds and profiles can render badges without recomputing.
    achievementTier: { type: Number, default: 0, min: 0, max: 9, index: true },
    // Daily posting streak: consecutive UTC days with at least one post/article.
    streakCount: { type: Number, default: 0, min: 0 },
    lastStreakDate: { type: Date, default: null },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastPostAt: { type: Date, default: null },
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
    // 18+ content preference (Reddit-style). When false, sensitive posts
    // render blurred and require opt-in to reveal.
    showSensitive: { type: Boolean, default: false },
    // Date of birth for 18+ gating — settable exactly once, never editable.
    // Saved even if under 18 (one-shot lock); showSensitive may only turn
    // on when age >= 18. Only ever exposed on own /me payload.
    dob: { type: Date, default: null },
    dobSetAt: { type: Date, default: null },

    // ── DPDP consent ledger (current state; history in ConsentRecord) ──
    consent: {
      termsVersion: { type: String, default: null },
      privacyVersion: { type: String, default: null },
      acceptedAt: { type: Date, default: null },
      withdrawnAt: { type: Date, default: null },
      analytics: { type: Boolean, default: false },
      ip: { type: String, default: null, maxlength: 64 },
      userAgent: { type: String, default: null, maxlength: 500 },
    },

    // DPDP child account: 13-17 requires verifiable guardian consent before
    // the account can be used. Under-13 registration is rejected.
    isMinor: { type: Boolean, default: false, index: true },
    guardian: {
      name: { type: String, default: null, trim: true, maxlength: 80 },
      email: { type: String, default: null, lowercase: true, trim: true, maxlength: 254 },
      consentStatus: {
        type: String,
        enum: ["not_required", "pending", "granted", "withdrawn"],
        default: "not_required",
        index: true,
      },
      consentAt: { type: Date, default: null },
      consentIp: { type: String, default: null, maxlength: 64 },
      consentUserAgent: { type: String, default: null, maxlength: 500 },
    },

    // dual-token: hashed refresh token (sha256 hex)
    refreshTokenHash: { type: String, default: null, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    // moderation — suspend/ban via admin dashboard
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedAt: { type: Date, default: null },
    suspendReason: { type: String, default: null, maxlength: 500 },
    // Account standing shown to the owner on /menu. Set from the admin
    // dashboard; "suspended" is the only value that changes enforcement —
    // isSuspended stays the flag protect()/login/refresh gate on, and the two
    // are kept in sync wherever an admin changes this (see adminService).
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "good",
      index: true,
    },
    // Optional note the owner sees next to a non-good status.
    accountStatusReason: { type: String, default: null, maxlength: 500 },
    accountStatusAt: { type: Date, default: null },
    // Temporary read-only restriction. accountStatus is "restricted" while
    // active; restrictedUntil drives the auto-lift (see utils/accountState.js).
    restrictedUntil: { type: Date, default: null, index: true },
    restrictedAt: { type: Date, default: null },
    restrictionReason: { type: String, default: null, maxlength: 500 },
    // Permanent ban: no login, no sessions, and content hidden from the app.
    // Distinct from isSuspended / isDeactivated so unban can restore cleanly.
    isBanned: { type: Boolean, default: false, index: true },
    bannedAt: { type: Date, default: null },
    banReason: { type: String, default: null, maxlength: 500 },
    // True only when the ban itself flipped isDeactivated; unban reverts it.
    banSetDeactivated: { type: Boolean, default: false },
    // badge tiers — owner (red, exactly OWNER_EMAIL), pro (gold, future
    // subscription), verified (blue, admin-granted via verification appeals).
    // isOwner syncs from email on save so no email ever leaks to clients for
    // badge checks.
    isPro: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false, index: true },
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

// Owner flag follows the email — single source of truth is OWNER_EMAIL, so
// clients never need the email address to decide the red badge.
userSchema.pre("save", function (next) {
  try {
    if (this.isNew || this.isModified("email")) {
      const clean = String(this.email || "").toLowerCase().trim();
      this.isOwner = clean === env.OWNER_EMAIL;
    }
  } catch {}
  next();
});

export const User = mongoose.model("User", userSchema);
