import { College } from "../models/College.js";
import { User } from "../models/User.js";
import { Post } from "../models/Post.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { Bookmark } from "../models/Bookmark.js";
import { blockService } from "./blockService.js";
import { cleanCollegeName, slugifyCollege } from "../utils/college.js";
import { AppError } from "../utils/AppError.js";

async function attachFlags(posts, viewerId) {
  if (!posts.length || !viewerId) return;
  const ids = posts.map((p) => p._id);
  const [likes, reposts, saves] = await Promise.all([
    Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
    Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
    Bookmark.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
  ]);
  const likeSet = new Set(likes.map((l) => String(l.post)));
  const repostSet = new Set(reposts.map((r) => String(r.post)));
  const saveSet = new Set(saves.map((s) => String(s.post)));
  posts.forEach((p) => {
    p.isLiked = likeSet.has(String(p._id));
    p.isReposted = repostSet.has(String(p._id));
    p.isBookmarked = saveSet.has(String(p._id));
  });
}

export const collegeService = {
  slugifyCollege,
  cleanCollegeName,

  async ensureCollege(displayName) {
    const clean = cleanCollegeName(displayName);
    const slug = slugifyCollege(displayName);
    if (!clean || !slug) return null;
    const doc = await College.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name: clean, slug } },
      { upsert: true, new: true }
    ).lean();
    return doc;
  },

  // Backfill collegeSlug on users + College docs from distinct user input.
  // Safe to run repeatedly; only touches users missing collegeSlug.
  async backfill() {
    const users = await User.find({
      college: { $ne: null },
      $or: [{ collegeSlug: null }, { collegeSlug: { $exists: false } }],
    })
      .select("_id college")
      .lean();
    let touched = 0;
    const slugToName = new Map();
    for (const u of users) {
      const slug = slugifyCollege(u.college);
      if (!slug) continue;
      await User.updateOne({ _id: u._id }, { $set: { collegeSlug: slug } });
      touched += 1;
      if (!slugToName.has(slug)) slugToName.set(slug, cleanCollegeName(u.college));
    }
    for (const [slug, name] of slugToName) {
      await College.findOneAndUpdate(
        { slug },
        { $setOnInsert: { name, slug } },
        { upsert: true }
      );
    }
    // refresh member counts for all colleges touched
    for (const [slug] of slugToName) {
      const count = await User.countDocuments({ collegeSlug: slug });
      await College.updateOne({ slug }, { $set: { memberCount: count } });
    }
    return { usersTouched: touched, collegesTouched: slugToName.size };
  },

  async search({ q, page = 1, limit = 12 }) {
    const query = String(q || "").trim().slice(0, 100);
    const lim = Math.max(1, Math.min(50, Number(limit) || 12));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    if (College.estimatedDocumentCount) {
      // lazy backfill if collection empty but users have colleges
      const n = await College.countDocuments().catch(() => 0);
      if (n === 0) {
        try {
          await this.backfill();
        } catch {}
      }
    }
    const filter = query
      ? {
          $or: [
            { name: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
            { slug: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      College.find(filter).sort({ memberCount: -1, name: 1 }).skip(skip).limit(lim).lean(),
      College.countDocuments(filter),
    ]);
    return { colleges: rows, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async getBySlug(slug, viewerId = null) {
    const clean = String(slug || "").toLowerCase().trim().slice(0, 80);
    if (!clean) throw new AppError("Invalid college", 400, "INVALID_COLLEGE");
    let college = await College.findOne({ slug: clean }).lean();
    if (!college) {
      // derive on-read: if users claim this slug, auto-create from most common display name
      const top = await User.aggregate([
        { $match: { collegeSlug: clean } },
        { $group: { _id: "$college", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      if (!top.length) throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
      college = await College.findOneAndUpdate(
        { slug: clean },
        { $setOnInsert: { name: cleanCollegeName(top[0]._id) || clean, slug: clean } },
        { upsert: true, new: true }
      ).lean();
    }
    const [memberCount, memberIds] = await Promise.all([
      User.countDocuments({ collegeSlug: clean }),
      User.find({ collegeSlug: clean }).select("_id").lean(),
    ]);
    const ids = memberIds.map((m) => m._id);
    let postCount = 0;
    if (ids.length) {
      const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
      const authorFilter = hidden.length
        ? { $in: ids.filter((id) => !hidden.map(String).includes(String(id))) }
        : { $in: ids };
      if (authorFilter.$in.length) postCount = await Post.countDocuments({ author: authorFilter });
    }
    // lazy refresh cached counters (best-effort, no await chain failure)
    College.updateOne({ slug: clean }, { $set: { memberCount, postCount } }).catch(() => {});
    return { ...college, memberCount, postCount };
  },

  async listMembers(slug, { page = 1, limit = 20, viewerId = null }) {
    const clean = String(slug || "").toLowerCase().trim().slice(0, 80);
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const exists = await College.exists({ slug: clean });
    if (!exists) {
      // allow listing even before College doc exists if users claim the slug
      const anyUser = await User.exists({ collegeSlug: clean });
      if (!anyUser) throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
      await this.ensureCollege(clean);
    }
    const filter = { collegeSlug: clean };
    if (viewerId) {
      const hidden = await blockService.blockedIdsFor(viewerId);
      if (hidden.length) filter._id = { $nin: hidden };
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter),
    ]);
    let followingSet = new Set();
    if (viewerId && users.length) {
      const { Follow } = await import("../models/Follow.js");
      const ids = users.map((u) => u._id);
      const follows = await Follow.find({ follower: viewerId, following: { $in: ids } })
        .select("following")
        .lean();
      followingSet = new Set(follows.map((f) => String(f.following)));
    }
    const safe = users.map((u) => {
      const { passwordHash, refreshTokenHash, __v, ...rest } = u;
      return { ...rest, isFollowing: followingSet.has(String(u._id)) };
    });
    return { users: safe, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },

  async listPosts(slug, { page = 1, limit = 20, viewerId = null }) {
    const clean = String(slug || "").toLowerCase().trim().slice(0, 80);
    const lim = Math.max(1, Math.min(50, Number(limit) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;
    const members = await User.find({ collegeSlug: clean }).select("_id").lean();
    if (!members.length) {
      const exists = await College.exists({ slug: clean });
      if (!exists) throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
      return { posts: [], total: 0, page: pg, limit: lim, hasMore: false };
    }
    let ids = members.map((m) => m._id);
    if (viewerId) {
      const hidden = await blockService.blockedIdsFor(viewerId);
      if (hidden.length) {
        const set = new Set(hidden.map(String));
        ids = ids.filter((id) => !set.has(String(id)));
      }
    }
    if (!ids.length) return { posts: [], total: 0, page: pg, limit: lim, hasMore: false };
    const filter = { author: { $in: ids } };
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("author", "fullName username avatarUrl isEmailVerified college collegeSlug")
        .lean(),
      Post.countDocuments(filter),
    ]);
    await attachFlags(posts, viewerId);
    return { posts, total, page: pg, limit: lim, hasMore: skip + lim < total };
  },
};
