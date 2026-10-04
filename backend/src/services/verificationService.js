import { User } from "../models/User.js";
import {
  VerificationRequest,
  VERIFICATION_REAPPEAL_COOLDOWN_MS,
  VERIFICATION_THRESHOLD_FOLLOWERS,
  VERIFICATION_THRESHOLD_POSTS,
} from "../models/VerificationRequest.js";
import { AppError } from "../utils/AppError.js";

export function isEligibleForVerification(user) {
  const posts = Number(user?.postCount || 0);
  const followers = Number(user?.followersCount || 0);
  return posts >= VERIFICATION_THRESHOLD_POSTS || followers >= VERIFICATION_THRESHOLD_FOLLOWERS;
}

export function verificationEligibility(user) {
  const posts = Number(user?.postCount || 0);
  const followers = Number(user?.followersCount || 0);
  const postsMet = posts >= VERIFICATION_THRESHOLD_POSTS;
  const followersMet = followers >= VERIFICATION_THRESHOLD_FOLLOWERS;
  return {
    posts,
    followers,
    postsNeeded: VERIFICATION_THRESHOLD_POSTS,
    followersNeeded: VERIFICATION_THRESHOLD_FOLLOWERS,
    postsMet,
    followersMet,
    eligible: postsMet || followersMet,
    isVerified: Boolean(user?.isVerified),
  };
}

export const verificationService = {
  async getMyStatus(userId) {
    const user = await User.findById(userId).select("postCount followersCount isVerified").lean();
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const eligibility = verificationEligibility(user);
    const [pending, lastRejected, last] = await Promise.all([
      VerificationRequest.findOne({ user: userId, status: "open" }).sort({ createdAt: -1 }).lean(),
      VerificationRequest.findOne({ user: userId, status: "rejected" }).sort({ createdAt: -1 }).lean(),
      VerificationRequest.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    ]);
    let cooldownUntil = null;
    if (!pending && lastRejected?.createdAt) {
      const until = new Date(lastRejected.createdAt).getTime() + VERIFICATION_REAPPEAL_COOLDOWN_MS;
      if (until > Date.now()) cooldownUntil = new Date(until).toISOString();
    }
    return { eligibility, pending, last, cooldownUntil };
  },

  async requestVerification(userId, message) {
    const user = await User.findById(userId).select("postCount followersCount isVerified").lean();
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isVerified) throw new AppError("Already verified.", 400, "ALREADY_VERIFIED");
    const eligibility = verificationEligibility(user);
    if (!eligibility.eligible)
      throw new AppError(
        `Need ${VERIFICATION_THRESHOLD_POSTS}+ posts or ${VERIFICATION_THRESHOLD_FOLLOWERS}+ followers to request verification.`,
        400,
        "NOT_ELIGIBLE"
      );
    const pending = await VerificationRequest.findOne({ user: userId, status: "open" });
    if (pending) throw new AppError("A verification request is already pending.", 409, "ALREADY_PENDING");
    const lastRejected = await VerificationRequest.findOne({ user: userId, status: "rejected" }).sort({ createdAt: -1 });
    if (lastRejected) {
      const until = new Date(lastRejected.createdAt).getTime() + VERIFICATION_REAPPEAL_COOLDOWN_MS;
      if (until > Date.now())
        throw new AppError("Please wait before re-appealing.", 429, "REAPPEAL_COOLDOWN", {
          cooldownUntil: new Date(until).toISOString(),
        });
    }
    const req = await VerificationRequest.create({
      user: userId,
      postCount: eligibility.posts,
      followersCount: eligibility.followers,
      message: message ? String(message).slice(0, 500) : null,
    });
    return { request: req, eligibility };
  },
};
