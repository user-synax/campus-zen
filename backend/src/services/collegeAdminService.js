import { College } from "../models/College.js";
import { CollegeAdmin } from "../models/CollegeAdmin.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { notificationService } from "./notificationService.js";
import { presenceService } from "./presenceService.js";

// Default profile CARD projection — never leaks email/private fields.
const USER_FIELDS =
  "fullName username avatarUrl isEmailVerified isVerified isPro isOwner achievementTier streakCount";

function cleanSlug(slug) {
  return String(slug || "").toLowerCase().trim().slice(0, 80);
}

async function ensureCollege(slug) {
  const college = await College.findOne({ slug: cleanSlug(slug) }).lean();
  if (!college) throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
  return college;
}

async function getTarget(userId) {
  const target = await User.findById(userId)
    .select("fullName username avatarUrl isBanned isDeactivated isOwner collegeSlug")
    .lean();
  if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return target;
}

/**
 * The platform owner implicitly holds every cap. Delegated college admins:
 *  - may never act on the owner
 *  - may never act on another (same-college) college admin — only the owner
 *    manages the moderation team.
 */
async function assertNotModeratorTarget(slug, targetUserId, viewer) {
  if (viewer.isOwner) return;
  const isMod = await CollegeAdmin.exists({ collegeSlug: cleanSlug(slug), user: targetUserId });
  if (isMod) {
    throw new AppError(
      "Only the owner can act on a college admin.",
      403,
      "COLLEGE_MOD_PROTECTED",
    );
  }
}

export const collegeAdminService = {
  /** The viewer's effective role on a college: owner | admin | user | guest. */
  async myCaps(slug, user) {
    if (!user) return { role: "guest", caps: null };
    if (user.isOwner) {
      return {
        role: "owner",
        caps: { kick: true, ban: true, moderatePosts: true },
      };
    }
    const doc = await CollegeAdmin.findOne({
      collegeSlug: cleanSlug(slug),
      user: user._id,
    }).lean();
    if (doc) return { role: "admin", caps: doc.caps };
    return { role: "user", caps: null };
  },

  /** Owner-only console: admins with their switch states + banned members. */
  async listAdmins(slug) {
    const clean = cleanSlug(slug);
    await ensureCollege(clean);
    const [admins, college] = await Promise.all([
      CollegeAdmin.find({ collegeSlug: clean })
        .sort({ createdAt: -1 })
        .populate("user", USER_FIELDS)
        .populate("grantedBy", "fullName username")
        .lean(),
      College.findOne({ slug: clean }).select("name bannedUserIds").lean(),
    ]);
    const bannedIds = college?.bannedUserIds || [];
    const banned = bannedIds.length ? await User.find({ _id: { $in: bannedIds } }).select(USER_FIELDS).lean() : [];
    return { admins, banned: banned.map((b) => ({ ...b, isBannedHere: true })) };
  },

  /** Assign any joined user as an admin of this college. Caps start OFF. */
  async addAdmin(slug, username, grantedBy) {
    const clean = cleanSlug(slug);
    await ensureCollege(clean);
    const target = await User.findOne({
      username: String(username || "").toLowerCase().trim(),
    }).select("_id isBanned isDeactivated isOwner");
    if (!target) throw new AppError("No user with that username.", 404, "USER_NOT_FOUND");
    if (target.isBanned || target.isDeactivated) {
      throw new AppError("That account can't be made a college admin.", 403, "USER_INACTIVE");
    }
    if (target.isOwner) {
      throw new AppError("The owner is already in charge of every college.", 409, "ALREADY_OWNER");
    }
    const existing = await CollegeAdmin.findOne({ collegeSlug: clean, user: target._id });
    if (existing) throw new AppError("This person is already an admin here.", 409, "ADMIN_EXISTS");
    const doc = await CollegeAdmin.create({
      collegeSlug: clean,
      user: target._id,
      caps: { kick: false, ban: false, moderatePosts: false },
      grantedBy,
    });
    // population for the immediate UI card
    const user = await User.findById(target._id).select(USER_FIELDS).lean();
    return { ...doc.toObject(), user };
  },

  /** Flip any subset of the three switches. Owner can do this anytime. */
  async updateCaps(slug, targetUserId, caps) {
    const clean = cleanSlug(slug);
    const doc = await CollegeAdmin.findOne({ collegeSlug: clean, user: targetUserId });
    if (!doc) throw new AppError("Admin not found for this college.", 404, "ADMIN_NOT_FOUND");
    for (const cap of ["kick", "ban", "moderatePosts"]) {
      if (caps[cap] !== undefined) doc.caps[cap] = Boolean(caps[cap]);
    }
    await doc.save();
    const user = await User.findById(doc.user).select(USER_FIELDS).lean();
    return { ...doc.toObject(), user };
  },

  async removeAdmin(slug, targetUserId) {
    const res = await CollegeAdmin.deleteOne({
      collegeSlug: cleanSlug(slug),
      user: targetUserId,
    });
    if (res.deletedCount === 0) {
      throw new AppError("Admin not found for this college.", 404, "ADMIN_NOT_FOUND");
    }
    return { removed: true };
  },

  // ── Member actions ──────────────────────────────────────────────────────

  /** Remove a member from the college. They can re-claim it anytime. */
  async kickMember(slug, targetUserId, moderator) {
    const clean = cleanSlug(slug);
    const college = await ensureCollege(clean);
    const target = await getTarget(targetUserId);
    if (target.isOwner) throw new AppError("The owner cannot be kicked.", 403, "OWNER_PROTECTED");
    if (target.collegeSlug !== clean) {
      throw new AppError("That person is not a member of this college.", 400, "NOT_A_MEMBER");
    }
    await assertNotModeratorTarget(clean, target._id, moderator);

    await User.updateOne(
      { _id: target._id, collegeSlug: clean },
      { $set: { college: null, collegeSlug: null } },
    );
    await College.updateOne({ slug: clean }, { $inc: { memberCount: -1 } });
    await College.updateOne(
      { slug: clean, memberCount: { $lt: 0 } },
      { $set: { memberCount: 0 } },
    );

    await notificationService.createAdminNotice({
      recipient: target._id,
      type: "college_kick",
      title: `Removed from ${college.name}`,
      body: `A college admin removed you from ${college.name}. You can set your college again from your profile settings — unless the team later bans you.`,
    }).catch(() => {});
    // They leave the college's active-now strip immediately.
    presenceService.dropUser(String(target._id), clean).catch(() => {});
    return { kicked: true };
  },

  /** Blacklist a member (implies removal). No re-claim afterwards. */
  async banMember(slug, targetUserId, moderator) {
    const clean = cleanSlug(slug);
    const college = await ensureCollege(clean);
    const target = await getTarget(targetUserId);
    if (target.isOwner) throw new AppError("The owner cannot be banned.", 403, "OWNER_PROTECTED");
    if (target.collegeSlug !== clean) {
      throw new AppError("That person is not a member of this college.", 400, "NOT_A_MEMBER");
    }
    await assertNotModeratorTarget(clean, target._id, moderator);

    const already = (college.bannedUserIds || []).some(
      (id) => String(id) === String(target._id),
    );
    if (!already) {
      await College.updateOne(
        { slug: clean },
        { $addToSet: { bannedUserIds: target._id } },
      );
    }
    if (target.collegeSlug === clean) {
      await User.updateOne(
        { _id: target._id, collegeSlug: clean },
        { $set: { college: null, collegeSlug: null } },
      );
      await College.updateOne({ slug: clean }, { $inc: { memberCount: -1 } });
      await College.updateOne(
        { slug: clean, memberCount: { $lt: 0 } },
        { $set: { memberCount: 0 } },
      );
    }

    await notificationService.createAdminNotice({
      recipient: target._id,
      type: "college_ban",
      title: `Banned from ${college.name}`,
      body: `A college admin banned you from ${college.name} — your posts stay on CampusZen, but this college page is no longer yours. If this is a mistake, reply to your verification email.`,
    }).catch(() => {});
    // They leave the college's active-now strip immediately.
    presenceService.dropUser(String(target._id), clean).catch(() => {});
    return { banned: true };
  },

  /** Lift a college blacklist (owner or a `ban`-cap admin). */
  async unbanMember(slug, targetUserId) {
    const clean = cleanSlug(slug);
    await ensureCollege(clean);
    const res = await College.updateOne(
      { slug: clean },
      { $pull: { bannedUserIds: targetUserId } },
    );
    if (!res || res.matchedCount === 0) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }
    return { unbanned: true };
  },

  /**
   * Delete one of the college's member posts (cap: moderatePosts).
   * Anonymous posts leave the college context hidden by design — only the
   * platform /admin console can touch those.
   */
  async moderatePost(slug, postId, moderator) {
    const clean = cleanSlug(slug);
    await ensureCollege(clean);
    const post = await Post.findById(postId).select("author isAnonymous").lean();
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) {
      throw new AppError(
        "Anonymous posts are moderated only from the platform console.",
        403,
        "ANON_PROTECTED",
      );
    }
    const author = await User.findById(post.author).select("collegeSlug").lean();
    if (!author || author.collegeSlug !== clean) {
      throw new AppError(
        "This post is outside this college's scope.",
        403,
        "NOT_COLLEGE_CONTEXT",
      );
    }
    await postService.removeAsModerator(post._id, moderator._id);
    return { deleted: true };
  },
};
