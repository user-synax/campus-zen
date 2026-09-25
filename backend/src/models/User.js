import mongoose from "mongoose";

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
    bio: { type: String, default: null, maxlength: 160 },
    college: { type: String, default: null, trim: true },
    course: { type: String, default: null, trim: true }, // branch
    academicYear: {
      type: String,
      default: null,
      enum: {
        values: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduated", null],
        message: "{VALUE} is not supported",
      },
    },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },

    // dual-token: hashed refresh token (sha256 hex)
    refreshTokenHash: { type: String, default: null, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// text index for future search (PRD §13) — keep lightweight
userSchema.index({ username: "text", fullName: "text" });

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model("User", userSchema);
