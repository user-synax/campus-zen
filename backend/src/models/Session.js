import mongoose from "mongoose";

// One document per signed-in device. The refresh token carries this document's
// id in its `sid` claim, so a refresh can only rotate its own session — logging
// in on a new phone no longer revokes the laptop.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // sha256 of the *current* refresh token. Rotated on every refresh; a
    // presented token that matches neither this nor the previous one means a
    // replayed (stolen) token.
    tokenHash: { type: String, required: true, unique: true },
    // Kept for a short grace window so two tabs refreshing at the same instant
    // don't look like token theft, and so a client that lost the rotated cookie
    // can recover instead of being logged out.
    prevTokenHash: { type: String, default: null },
    rotatedAt: { type: Date, default: null },
    device: {
      userAgent: { type: String, default: "", maxlength: 500 },
      platform: { type: String, default: "", maxlength: 60 },
      label: { type: String, default: "", maxlength: 80 },
    },
    ip: { type: String, default: null, maxlength: 64 },
    // remember=true keeps the 7d window across rotations; false the 1d window
    remember: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, lastUsedAt: -1 });
// Mongo's TTL monitor removes expired sessions; the service also checks
// expiresAt so a stale row can never be used before the monitor runs.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);
