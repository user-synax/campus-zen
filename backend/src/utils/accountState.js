import { User } from "../models/User.js";
import { cache, CacheKeys } from "./cache.js";

// A restriction is active only while accountStatus is "restricted" AND the
// deadline is still in the future. A ban always wins over a restriction.
export function restrictionIsActive(user, now = Date.now()) {
  if (!user || user.isBanned) return false;
  if (user.accountStatus !== "restricted") return false;
  if (!user.restrictedUntil) return false;
  return new Date(user.restrictedUntil).getTime() > now;
}

export function banIsActive(user) {
  return Boolean(user?.isBanned);
}

// The status the owner should see, accounting for an expired restriction that
// has not been swept yet.
export function effectiveAccountStatus(user, now = Date.now()) {
  if (!user) return "good";
  if (user.isBanned) return "banned";
  if (user.accountStatus === "restricted" && !restrictionIsActive(user, now)) {
    return "good";
  }
  return user.accountStatus || "good";
}

// Auto-lift expired restrictions. Called on a timer from server.js and lazily
// from the admin dashboard, so a temporary restriction never needs a manual
// "unrestrict" click.
export async function sweepExpiredRestrictions() {
  const now = new Date();
  const expired = await User.find({
    accountStatus: "restricted",
    restrictedUntil: { $ne: null, $lte: now },
  })
    .select("_id username")
    .lean();
  if (!expired.length) return 0;

  await User.updateMany(
    { _id: { $in: expired.map((u) => u._id) } },
    {
      $set: {
        accountStatus: "good",
        restrictedUntil: null,
        restrictedAt: null,
        restrictionReason: null,
        accountStatusReason: null,
        accountStatusAt: now,
      },
    }
  );
  for (const user of expired) {
    cache.del(CacheKeys.userProfile(user.username));
  }
  return expired.length;
}
