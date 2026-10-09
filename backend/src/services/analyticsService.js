import { Post } from "../models/Post.js";
import { PostView } from "../models/PostView.js";
import { Like } from "../models/Like.js";
import { Comment } from "../models/Comment.js";
import { Repost } from "../models/Repost.js";
import { Bookmark } from "../models/Bookmark.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";

const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function parseRange(raw) {
  return raw === "7d" ? "7d" : "24h";
}

// Author-only overview: range-filtered impressions / likes / replies /
// reposts / bookmarks across ALL of the author's posts (posts + articles),
// plus top-5 posts by range views.
//
// All engagement collections carry createdAt (timestamps:true), so range
// filtering is a plain $gte match — no new fields needed. viewCount on Post
// is all-time; range impressions come from PostView rows.
export const analyticsService = {
  parseRange,

  async overview(authorId, rawRange) {
    const range = parseRange(rawRange);
    const cacheKey = CacheKeys.analyticsOverview(authorId, range);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - RANGE_MS[range]);
    const postIds = await Post.find({ author: authorId }).select("_id").lean().then((rows) => rows.map((r) => r._id));

    if (!postIds.length) {
      const empty = {
        range,
        since,
        totals: { impressions: 0, likes: 0, replies: 0, reposts: 0, bookmarks: 0, posts: 0 },
        allTime: { impressions: 0, posts: 0 },
        topPosts: [],
      };
      cache.set(cacheKey, empty, TTL.ANALYTICS);
      return empty;
    }

    const [impressions, likes, replies, reposts, bookmarks, allTimeAgg, topViewRows] = await Promise.all([
      PostView.countDocuments({ post: { $in: postIds }, createdAt: { $gte: since } }),
      Like.countDocuments({ post: { $in: postIds }, createdAt: { $gte: since } }),
      Comment.countDocuments({ post: { $in: postIds }, createdAt: { $gte: since } }),
      Repost.countDocuments({ post: { $in: postIds }, createdAt: { $gte: since } }),
      Bookmark.countDocuments({ post: { $in: postIds }, createdAt: { $gte: since } }),
      Post.aggregate([
        { $match: { author: authorId } },
        { $group: { _id: null, impressions: { $sum: { $ifNull: ["$viewCount", 0] } }, posts: { $sum: 1 } } },
      ]),
      // Top posts by range views — single aggregation, no N+1.
      PostView.aggregate([
        { $match: { post: { $in: postIds }, createdAt: { $gte: since } } },
        { $group: { _id: "$post", viewsInRange: { $sum: 1 } } },
        { $sort: { viewsInRange: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const allTime = allTimeAgg[0] || { impressions: 0, posts: 0 };

    let topPosts = [];
    if (topViewRows.length) {
      const ids = topViewRows.map((r) => r._id);
      const viewsMap = new Map(topViewRows.map((r) => [String(r._id), r.viewsInRange]));
      const posts = await Post.find({ _id: { $in: ids } })
        .select("_id kind title slug text createdAt viewCount likeCount replyCount repostCount")
        .lean();
      // Bookmark totals are not denormalized on Post — one grouped query.
      const bmRows = await Bookmark.aggregate([
        { $match: { post: { $in: ids } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]);
      const bmMap = new Map(bmRows.map((r) => [String(r._id), r.count]));
      topPosts = posts
        .map((p) => ({
          _id: p._id,
          kind: p.kind,
          title: p.title || null,
          slug: p.slug || null,
          text: p.text ? String(p.text).slice(0, 140) : null,
          createdAt: p.createdAt,
          viewsInRange: viewsMap.get(String(p._id)) || 0,
          viewCount: p.viewCount || 0,
          likeCount: p.likeCount || 0,
          replyCount: p.replyCount || 0,
          repostCount: p.repostCount || 0,
          bookmarkCount: bmMap.get(String(p._id)) || 0,
        }))
        .sort((a, b) => b.viewsInRange - a.viewsInRange);
    } else {
      // No views in range — fall back to most-viewed all-time so the
      // section is never empty for authors with older posts.
      const fallback = await Post.find({ author: authorId })
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(5)
        .select("_id kind title slug text createdAt viewCount likeCount replyCount repostCount")
        .lean();
      if (fallback.length) {
        const ids = fallback.map((p) => p._id);
        const bmRows = await Bookmark.aggregate([
          { $match: { post: { $in: ids } } },
          { $group: { _id: "$post", count: { $sum: 1 } } },
        ]);
        const bmMap = new Map(bmRows.map((r) => [String(r._id), r.count]));
        topPosts = fallback.map((p) => ({
          _id: p._id,
          kind: p.kind,
          title: p.title || null,
          slug: p.slug || null,
          text: p.text ? String(p.text).slice(0, 140) : null,
          createdAt: p.createdAt,
          viewsInRange: 0,
          viewCount: p.viewCount || 0,
          likeCount: p.likeCount || 0,
          replyCount: p.replyCount || 0,
          repostCount: p.repostCount || 0,
          bookmarkCount: bmMap.get(String(p._id)) || 0,
        }));
      }
    }

    const result = {
      range,
      since,
      totals: { impressions, likes, replies, reposts, bookmarks, posts: postIds.length },
      allTime: { impressions: allTime.impressions || 0, posts: allTime.posts || 0 },
      topPosts,
    };
    cache.set(cacheKey, result, TTL.ANALYTICS);
    return result;
  },
};
