import { User } from "../models/User.js";
import { Post } from "../models/Post.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { blockService } from "./blockService.js";

export const searchService = {
  async search({ q, page = 1, limit = 20, type = "all", viewerId }) {
    const query = String(q || "").trim();
    if (!query || query.length < 1) {
      return { users: [], posts: [], totalUsers: 0, totalPosts: 0, page: Number(page), limit: Number(limit), hasMoreUsers: false, hasMorePosts: false };
    }
    if (query.length > 100) {
      // truncate
      q = query.slice(0, 100);
    }

    const lim = Math.max(1, Math.min(50, Number(limit)));
    const pg = Math.max(1, Number(page));
    const skip = (pg - 1) * lim;

    const wantUsers = type === "all" || type === "users";
    const wantPosts = type === "all" || type === "posts";

    // escape regex
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(esc, "i");

    const promises = [];

    // users — use text index when query >=2 chars for speed, fallback regex for 1 char
    let usersPromise = Promise.resolve({ users: [], total: 0 });
    if (wantUsers) {
      usersPromise = (async () => {
        // try text search first for >=2 chars
        let filter;
        let sort = { score: { $meta: "textScore" } };
        let useText = query.length >= 2;
        if (useText) {
          filter = { $text: { $search: query } };
        } else {
          filter = { $or: [{ username: re }, { fullName: re }, { bio: re }, { college: re }, { course: re }] };
          sort = { createdAt: -1 };
        }
        // mutual hide for logged-in viewers
        if (viewerId) {
          const hidden = await blockService.blockedIdsFor(viewerId);
          if (hidden.length) filter._id = { $nin: hidden };
        }
        const [users, total] = await Promise.all([
          User.find(filter, useText ? { score: { $meta: "textScore" } } : {})
            .sort(useText ? { score: { $meta: "textScore" } } : { createdAt: -1 })
            .skip(skip)
            .limit(lim)
            .select("fullName username avatarUrl bio college course academicYear followersCount followingCount isEmailVerified")
            .lean(),
          User.countDocuments(filter),
        ]);
        // add isFollowing for viewer
        let followingSet = new Set();
        if (viewerId && users.length) {
          const { Follow } = await import("../models/Follow.js");
          const ids = users.map((u) => u._id);
          const follows = await Follow.find({ follower: viewerId, following: { $in: ids } }).select("following").lean();
          followingSet = new Set(follows.map((f) => String(f.following)));
        }
        const safe = users.map((u) => ({ ...u, isFollowing: followingSet.has(String(u._id)) }));
        return { users: safe, total };
      })();
    }

    let postsPromise = Promise.resolve({ posts: [], total: 0 });
    if (wantPosts) {
      postsPromise = (async () => {
        // use regex for now — text index exists but regex is predictable for small data; use text when query >=2
        let filter;
        if (query.length >= 2) {
          // try text search, fallback to regex if no results? For now use regex for consistency
          filter = { text: re };
        } else {
          filter = { text: re };
        }
        // hide posts by blocked authors for logged-in viewers
        if (viewerId) {
          const hidden = await blockService.blockedIdsFor(viewerId);
          if (hidden.length) filter.author = { $nin: hidden };
        }
        const [posts, total] = await Promise.all([
          Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified").lean(),
          Post.countDocuments(filter),
        ]);
        // add isLiked/isReposted for viewer
        if (viewerId && posts.length) {
          const ids = posts.map((p) => p._id);
          const [likes, reposts] = await Promise.all([
            Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
            Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
          ]);
          const likeSet = new Set(likes.map((l) => String(l.post)));
          const repostSet = new Set(reposts.map((r) => String(r.post)));
          posts.forEach((p) => {
            p.isLiked = likeSet.has(String(p._id));
            p.isReposted = repostSet.has(String(p._id));
          });
        }
        return { posts, total };
      })();
    }

    const [uRes, pRes] = await Promise.all([usersPromise, postsPromise]);

    return {
      users: uRes.users || [],
      posts: pRes.posts || [],
      totalUsers: uRes.total || 0,
      totalPosts: pRes.total || 0,
      page: pg,
      limit: lim,
      hasMoreUsers: skip + lim < (uRes.total || 0),
      hasMorePosts: skip + lim < (pRes.total || 0),
    };
  },
};
