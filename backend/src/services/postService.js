import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { Bookmark } from "../models/Bookmark.js";
import { PollVote } from "../models/PollVote.js";
import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { blockService } from "./blockService.js";
import { extractHashtags, normalizeHashtag } from "../utils/hashtags.js";
import { extractMentions } from "../utils/mentions.js";
import { AppError } from "../utils/AppError.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

// poll durations allowed by the composer (days)
const POLL_DURATIONS = new Set([1, 3, 7]);

function buildPoll(pollInput) {
  if (!pollInput) return null;
  const rawOptions = Array.isArray(pollInput.options) ? pollInput.options : [];
  const options = rawOptions.map((o) => String(o ?? "").trim()).filter(Boolean);
  if (options.length < 2) throw new AppError("Poll needs 2-4 options", 400, "INVALID_POLL");
  if (options.length > 4) throw new AppError("Poll needs 2-4 options", 400, "INVALID_POLL");
  for (const o of options) {
    if (o.length > 80) throw new AppError("Poll options max 80 characters", 400, "INVALID_POLL");
  }
  const days = Number(pollInput.durationDays);
  if (!POLL_DURATIONS.has(days)) throw new AppError("Poll duration must be 1, 3 or 7 days", 400, "INVALID_POLL");
  return {
    options: options.map((text) => ({ text, votes: 0 })),
    totalVotes: 0,
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
}

function pollClosed(poll) {
  if (!poll?.expiresAt) return false;
  return new Date(poll.expiresAt).getTime() <= Date.now();
}

// Attach viewer-specific poll state in ONE query per list (only when a poll
// post is present). Guests get closed flags but no myVote. Keeps feed fast.
async function attachPollVotes(posts, viewerId) {
  if (!posts?.length) return;
  const withPoll = posts.filter((p) => p.poll?.options?.length);
  if (!withPoll.length) return;
  for (const p of withPoll) {
    if (p.poll) p.poll = { ...p.poll, closed: pollClosed(p.poll) };
  }
  if (!viewerId) {
    withPoll.forEach((p) => {
      p.myVote = null;
    });
    return;
  }
  const ids = withPoll.map((p) => p._id);
  const votes = await PollVote.find({ post: { $in: ids }, user: viewerId }).select("post optionIndex").lean();
  const map = new Map(votes.map((v) => [String(v.post), v.optionIndex]));
  withPoll.forEach((p) => {
    p.myVote = map.has(String(p._id)) ? map.get(String(p._id)) : null;
  });
}

// strip posts whose author is blocked (either direction) from a fetched list
async function withoutBlockedAuthors(posts, viewerId) {
  if (!viewerId || !posts.length) return posts;
  const hidden = await blockService.blockedIdsFor(viewerId);
  if (!hidden.length) return posts;
  const set = new Set(hidden.map(String));
  return posts.filter((p) => !set.has(String(p.author?._id || p.author)));
}

// private saves — no counters, no notifications; attached wherever isLiked/isReposted are set
async function attachBookmarked(posts, viewerId) {
  if (!viewerId || !posts.length) return;
  const ids = posts.map((p) => p._id);
  const saves = await Bookmark.find({ user: viewerId, post: { $in: ids } }).select("post").lean();
  const set = new Set(saves.map((s) => String(s.post)));
  posts.forEach((p) => {
    p.isBookmarked = set.has(String(p._id));
  });
}

// notify mentioned users — skips self, missing users, and optional skipId
// (e.g. post author on replies already gets a reply notification)
async function notifyMentions(actorId, usernames, postId, skipId = null) {
  if (!usernames?.length) return;
  const unique = [...new Set(usernames.map((u) => String(u).toLowerCase()))].slice(0, 10);
  for (const username of unique) {
    try {
      if (skipId && username === String(skipId).toLowerCase()) continue;
      const user = await User.findOne({ username }).select("_id username").lean();
      if (!user) continue;
      if (String(user._id) === String(actorId)) continue;
      if (skipId && String(user._id) === String(skipId)) continue;
      await notificationService.create({ recipient: user._id, actor: actorId, type: "mention", post: postId });
    } catch {}
  }
}

export const postService = {
  async create(authorId, text, imageFile, pollInput) {
    const t = text?.trim() || "";
    if (t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    const poll = buildPoll(pollInput);
    if (poll && imageFile) throw new AppError("Poll and image can't be combined", 400, "INVALID_POLL");
    if (!t && !imageFile && !poll) throw new AppError("Post must have text, an image or a poll", 400, "EMPTY_POST");

    let imageUrl = null;
    if (imageFile) {
      const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
      if (!isAppwriteConfigured()) throw new AppError("Image upload not configured", 503, "APPWRITE_NOT_CONFIGURED");
      const uploaded = await uploadToAppwrite(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
      imageUrl = uploaded.viewUrl;
    }

    const post = await Post.create({ author: authorId, text: t || undefined, imageUrl, poll: poll || undefined, hashtags: extractHashtags(t), mentions: extractMentions(t) });
    await User.findByIdAndUpdate(authorId, { $inc: { postCount: 1 } });
    await notifyMentions(authorId, extractMentions(t), post._id);
    // Invalidate caches that include this post
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${authorId}:*`);
    cache.delPattern("trending:*");
    cache.delPattern("hashtag:*");
    cache.delPattern(`media:${authorId}:*`);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner");
    return populated;
  },

  async getById(postId, viewerId) {
    const cacheKey = CacheKeys.post(postId);
    let post = cache.get(cacheKey);

    if (!post) {
      post = await Post.findById(postId).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean();
      if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
      cache.set(cacheKey, post, TTL.POST);
    }

    // blocked in either direction → indistinguishable from deleted
    if (viewerId) {
      const authorId = post.author?._id || post.author;
      if (await blockService.isBlocked(viewerId, authorId)) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    // Clone to avoid mutating cached object
    const result = { ...post };
    await attachPollVotes([result], viewerId);
    if (viewerId) {
      const [liked, reposted, bookmarked] = await Promise.all([
        Like.exists({ user: viewerId, post: postId }),
        Repost.exists({ user: viewerId, post: postId }),
        Bookmark.exists({ user: viewerId, post: postId }),
      ]);
      result.isLiked = Boolean(liked);
      result.isReposted = Boolean(reposted);
      result.isBookmarked = Boolean(bookmarked);
    }
    return result;
  },

  async update(postId, userId, text) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to edit this post", 403, "FORBIDDEN");
    if (Date.now() - new Date(post.createdAt).getTime() > EDIT_WINDOW_MS) throw new AppError("Edit window expired (5 minutes)", 403, "EDIT_WINDOW_EXPIRED");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    const oldMentions = new Set((post.mentions || []).map((m) => String(m).toLowerCase()));
    const newMentions = extractMentions(t);
    post.text = t;
    post.hashtags = extractHashtags(t);
    post.mentions = newMentions;
    post.edited = true;
    await post.save();
    const added = newMentions.filter((m) => !oldMentions.has(m));
    await notifyMentions(userId, added, post._id);
    // Invalidate caches
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${post.author}:*`);
    cache.delPattern("hashtag:*");
    cache.delPattern(`media:${post.author}:*`);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner");
    return populated;
  },

  async remove(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to delete this post", 403, "FORBIDDEN");
    await Post.deleteOne({ _id: postId });
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } }),
      User.updateOne({ _id: userId, pinnedPost: postId }, { $unset: { pinnedPost: 1 } }),
      Comment.deleteMany({ post: postId }),
      Like.deleteMany({ post: postId }),
      Repost.deleteMany({ post: postId }),
      Bookmark.deleteMany({ post: postId }),
      PollVote.deleteMany({ post: postId }),
    ]);
    // clamp
    await User.updateOne({ _id: userId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
    // Invalidate caches
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${userId}:*`);
    cache.delPattern("hashtag:*");
    cache.delPattern(`media:${userId}:*`);
    cache.delPattern("trending:*");
    // cleanup image from Appwrite
    if (post.imageUrl) {
      try {
        const { deleteFromAppwrite } = await import("../config/appwrite.js");
        const fileId = post.imageUrl.match(/\/files\/([^/]+)\//)?.[1];
        if (fileId) await deleteFromAppwrite(fileId);
      } catch {}
    }
    return { message: "Post deleted" };
  },

  async feed(userId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.feed(userId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // get following ids + self, minus blocked authors
    const follows = await Follow.find({ follower: userId }).select("following").lean();
    const ids = follows.map((f) => f.following);
    ids.push(userId);
    const hidden = await blockService.blockedIdsFor(userId);
    const authorFilter = hidden.length ? { $in: ids, $nin: hidden } : { $in: ids };
    // limit+1 probe instead of a second countDocuments scan — one query per
    // page instead of two (free-tier Mongo thanks us on every scroll)
    const posts = await Post.find({ author: authorFilter })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim + 1)
      .populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner")
      .lean();
    const hasMore = posts.length > lim;
    if (hasMore) posts.pop();
    // add isLiked/isReposted/isBookmarked
    if (posts.length && userId) {
      const postIds = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: userId, post: { $in: postIds } }).select("post").lean(),
        Repost.find({ user: userId, post: { $in: postIds } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
      await attachBookmarked(posts, userId);
    }
    await attachPollVotes(posts, userId);
    const result = { posts, page: Number(page), limit: lim, hasMore };
    cache.set(cacheKey, result, TTL.FEED);
    return result;
  },

  async publicFeed({ page = 1, limit = 20 }, viewerId) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.publicFeed(page, lim);
    const cached = cache.get(cacheKey);
    if (cached) {
      // Still need per-viewer data even on cache hit
      if (viewerId && cached.posts.length) {
        const posts = cached.posts.map(p => ({ ...p })); // shallow clone
        const postIds = posts.map((p) => p._id);
        const [likes, reposts] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reposts.map((r) => String(r.post)));
        posts.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
        await attachBookmarked(posts, viewerId);
        await attachPollVotes(posts, viewerId);
        return { ...cached, posts };
      }
      const freshPosts = cached.posts.map((p) => ({ ...p }));
      await attachPollVotes(freshPosts, viewerId || null);
      return { ...cached, posts: freshPosts };
    }

    const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
    const filter = hidden.length ? { author: { $nin: hidden } } : {};
    // same limit+1 probe as feed — no countDocuments scan per scroll page
    const posts = await Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim + 1).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean();
    const hasMore = posts.length > lim;
    if (hasMore) posts.pop();
    if (posts.length && viewerId) {
      const postIds = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
        Repost.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
      await attachBookmarked(posts, viewerId);
      await attachPollVotes(posts, viewerId);
    }
    const result = { posts, page: Number(page), limit: lim, hasMore };
    cache.set(cacheKey, result, TTL.PUBLIC_FEED);
    return result;
  },

  async toggleLike(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Like.findOne({ user: userId, post: postId });
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });
      await Post.updateOne({ _id: postId, likeCount: { $lt: 0 } }, { $set: { likeCount: 0 } });
      const updated = await Post.findById(postId).select("likeCount");
      // Invalidate caches that include this post's like count
      cache.del(CacheKeys.post(postId));
      cache.delPattern("feed:*");
      cache.delPattern("publicFeed:*");
      cache.delPattern(`userPosts:${post.author}:*`);
      cache.delPattern("hashtag:*");
      return { liked: false, likeCount: updated.likeCount };
    } else {
      try {
        await Like.create({ user: userId, post: postId });
      } catch (e) {
        if (e.code === 11000) throw new AppError("Already liked", 409, "ALREADY_LIKED");
        throw e;
      }
      await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });
      if (String(post.author) !== String(userId)) {
        try {
          await notificationService.create({ recipient: post.author, actor: userId, type: "like", post: postId });
        } catch {}
      }
      const updated = await Post.findById(postId).select("likeCount");
      // Invalidate caches that include this post's like count
      cache.del(CacheKeys.post(postId));
      cache.delPattern("feed:*");
      cache.delPattern("publicFeed:*");
      cache.delPattern(`userPosts:${post.author}:*`);
      cache.delPattern("hashtag:*");
      return { liked: true, likeCount: updated.likeCount };
    }
  },

  async toggleRepost(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Repost.findOne({ user: userId, post: postId });
    if (existing) {
      await Repost.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: -1 } });
      await Post.updateOne({ _id: postId, repostCount: { $lt: 0 } }, { $set: { repostCount: 0 } });
      const updated = await Post.findById(postId).select("repostCount");
      cache.del(CacheKeys.post(postId));
      cache.delPattern("feed:*");
      cache.delPattern("publicFeed:*");
      cache.delPattern(`userPosts:${post.author}:*`);
      cache.delPattern("hashtag:*");
      return { reposted: false, repostCount: updated.repostCount };
    } else {
      try {
        await Repost.create({ user: userId, post: postId });
      } catch (e) {
        if (e.code === 11000) throw new AppError("Already reposted", 409, "ALREADY_REPOSTED");
        throw e;
      }
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } });
      if (String(post.author) !== String(userId)) {
        try {
          await notificationService.create({ recipient: post.author, actor: userId, type: "repost", post: postId });
        } catch {}
      }
      const updated = await Post.findById(postId).select("repostCount");
      cache.del(CacheKeys.post(postId));
      cache.delPattern("feed:*");
      cache.delPattern("publicFeed:*");
      cache.delPattern(`userPosts:${post.author}:*`);
      cache.delPattern("hashtag:*");
      return { reposted: true, repostCount: updated.repostCount };
    }
  },

  async toggleBookmark(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Bookmark.findOne({ user: userId, post: postId });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      cache.del(CacheKeys.post(postId));
      cache.delPattern("feed:*");
      cache.delPattern("publicFeed:*");
      cache.delPattern(`userPosts:${post.author}:*`);
      cache.delPattern("hashtag:*");
      cache.delPattern(`bookmarks:${userId}:*`);
      return { bookmarked: false };
    }
    try {
      await Bookmark.create({ user: userId, post: postId });
    } catch (e) {
      if (e.code === 11000) throw new AppError("Already bookmarked", 409, "ALREADY_BOOKMARKED");
      throw e;
    }
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${post.author}:*`);
    cache.delPattern("hashtag:*");
    cache.delPattern(`bookmarks:${userId}:*`);
    return { bookmarked: true };
  },

  // single-choice poll vote, changeable until expiry. No feed invalidation —
  // feed caches are 30s and vote counts ride along; only the single-post
  // cache is dropped so detail stays fresh without cache stampedes.
  async vote(userId, postId, optionIndex) {
    const idx = Number(optionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new AppError("Invalid option", 400, "INVALID_POLL_VOTE");
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (!post.poll?.options?.length) throw new AppError("Post has no poll", 400, "NO_POLL");
    if (idx >= post.poll.options.length) throw new AppError("Invalid option", 400, "INVALID_POLL_VOTE");
    if (pollClosed(post.poll)) throw new AppError("Poll is closed", 400, "POLL_CLOSED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");

    const existing = await PollVote.findOne({ post: postId, user: userId });
    if (existing && existing.optionIndex === idx) {
      const fresh = await Post.findById(postId).lean();
      return { poll: { ...fresh.poll, closed: pollClosed(fresh.poll) }, myVote: idx };
    }
    if (existing) {
      const prev = existing.optionIndex;
      existing.optionIndex = idx;
      await existing.save();
      const inc = {
        [`poll.options.${idx}.votes`]: 1,
        [`poll.options.${prev}.votes`]: -1,
      };
      await Post.updateOne({ _id: postId }, { $inc: inc });
      await Post.updateOne({ _id: postId, [`poll.options.${prev}.votes`]: { $lt: 0 } }, { $set: { [`poll.options.${prev}.votes`]: 0 } });
    } else {
      try {
        await PollVote.create({ post: postId, user: userId, optionIndex: idx });
      } catch (e) {
        if (e.code === 11000) {
          // lost a race with another vote — treat as change path
          return this.vote(userId, postId, idx);
        }
        throw e;
      }
      await Post.updateOne(
        { _id: postId },
        { $inc: { [`poll.options.${idx}.votes`]: 1, "poll.totalVotes": 1 } },
      );
    }
    cache.del(CacheKeys.post(postId));
    const fresh = await Post.findById(postId).lean();
    return { poll: { ...fresh.poll, closed: pollClosed(fresh.poll) }, myVote: idx };
  },

  // own saved posts, newest-saved-first — private, viewerId must equal userId
  async bookmarks(userId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.bookmarks(userId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const [saves, total] = await Promise.all([
      Bookmark.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(lim).select("post").lean(),
      Bookmark.countDocuments({ user: userId }),
    ]);
    const postIds = saves.map((s) => s.post);
    if (postIds.length === 0) {
      const result = { posts: [], total, page: Number(page), limit: lim, hasMore: false };
      cache.set(cacheKey, result, TTL.BOOKMARKS);
      return result;
    }
    const posts = await Post.find({ _id: { $in: postIds } })
      .populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner")
      .lean();
    const map = new Map(posts.map((p) => [String(p._id), p]));
    let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
    ordered = await withoutBlockedAuthors(ordered, userId);
    if (ordered.length) {
      const ids = ordered.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: userId, post: { $in: ids } }).select("post").lean(),
        Repost.find({ user: userId, post: { $in: ids } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      ordered.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
        p.isBookmarked = true;
      });
      await attachPollVotes(ordered, userId);
    }
    const result = { posts: ordered, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.BOOKMARKS);
    return result;
  },

  async createComment(userId, postId, text) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Reply must be 1-500 characters", 400, "INVALID_TEXT");
    const mentions = extractMentions(t);
    const comment = await Comment.create({ post: postId, author: userId, text: t, mentions });
    await Post.findByIdAndUpdate(postId, { $inc: { replyCount: 1 } });
    if (String(post.author) !== String(userId)) {
      try {
        await notificationService.create({ recipient: post.author, actor: userId, type: "reply", post: postId });
      } catch {}
    }
    // mention notifications for everyone tagged except the post author
    // (they already get a reply notification above)
    await notifyMentions(userId, mentions, postId, post.author);
    // Invalidate caches
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${post.author}:*`);
    cache.delPattern("hashtag:*");
    cache.delPattern(`comments:${postId}:*`);
    const populated = await Comment.findById(comment._id).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner");
    const updatedPost = await Post.findById(postId).select("replyCount");
    return { comment: populated, replyCount: updatedPost.replyCount };
  },

  async getComments(postId, { page = 1, limit = 20 }, viewerId = null) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (viewerId && (await blockService.isBlocked(viewerId, post.author))) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.comments(postId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const [comments, total] = await Promise.all([
      Comment.find({ post: postId }).sort({ createdAt: 1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean(),
      Comment.countDocuments({ post: postId }),
    ]);
    const result = { comments, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.COMMENTS);
    return result;
  },

  // single endpoint for profile tabs — author / likedBy / repostedBy
  async list({ author, likedBy, repostedBy, page = 1, limit = 20, viewerId }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    let filter = {};
    let sort = { createdAt: -1 };
    let postIds = null;

    if (likedBy) {
      const cacheKey = CacheKeys.userLikes(likedBy, page, lim);
      const cached = cache.get(cacheKey);
      if (cached) return cached;
      const likes = await Like.find({ user: likedBy }).sort({ createdAt: -1 }).skip(skip).limit(lim).select("post").lean();
      postIds = likes.map((l) => l.post);
      if (postIds.length === 0) {
        const result = { posts: [], total: await Like.countDocuments({ user: likedBy }), page: Number(page), limit: lim, hasMore: false };
        cache.set(cacheKey, result, TTL.USER_POSTS);
        return result;
      }
      filter = { _id: { $in: postIds } };
      // preserve like order
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      if (viewerId) ordered = await withoutBlockedAuthors(ordered, viewerId);
      // add isLiked/isReposted
      if (viewerId && ordered.length) {
        const ids = ordered.map((p) => p._id);
        const [likes, reposts] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reposts.map((r) => String(r.post)));
        ordered.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
        await attachBookmarked(ordered, viewerId);
        await attachPollVotes(ordered, viewerId);
      }
      const total = await Like.countDocuments({ user: likedBy });
      const result = { posts: ordered, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
      cache.set(cacheKey, result, TTL.USER_POSTS);
      return result;
    }

    if (repostedBy) {
      const cacheKey = CacheKeys.userReposts(repostedBy, page, lim);
      const cached = cache.get(cacheKey);
      if (cached) return cached;
      const reposts = await Repost.find({ user: repostedBy }).sort({ createdAt: -1 }).skip(skip).limit(lim).select("post").lean();
      postIds = reposts.map((r) => r.post);
      if (postIds.length === 0) {
        const result = { posts: [], total: await Repost.countDocuments({ user: repostedBy }), page: Number(page), limit: lim, hasMore: false };
        cache.set(cacheKey, result, TTL.USER_POSTS);
        return result;
      }
      filter = { _id: { $in: postIds } };
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      if (viewerId) ordered = await withoutBlockedAuthors(ordered, viewerId);
      if (viewerId && ordered.length) {
        const ids = ordered.map((p) => p._id);
        const [likes, reps] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reps.map((r) => String(r.post)));
        ordered.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
        await attachBookmarked(ordered, viewerId);
        await attachPollVotes(ordered, viewerId);
      }
      const total = await Repost.countDocuments({ user: repostedBy });
      const result = { posts: ordered, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
      cache.set(cacheKey, result, TTL.USER_POSTS);
      return result;
    }

    if (author) {
      filter.author = author;
    }

    const cacheKey = author ? CacheKeys.userPosts(author, page, lim) : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter).sort(sort).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean(),
      Post.countDocuments(filter),
    ]);

    if (posts.length && viewerId) {
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
      await attachBookmarked(posts, viewerId);
      await attachPollVotes(posts, viewerId);
    }

    const result = { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    if (cacheKey) cache.set(cacheKey, result, TTL.USER_POSTS);
    return result;
  },

  // image-only posts by author for the profile Media tab — light payload for the grid
  async mediaByAuthor(authorId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.mediaByAuthor(authorId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const filter = { author: authorId, imageUrl: { $ne: null } };
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .select("_id imageUrl text createdAt likeCount replyCount repostCount")
        .lean(),
      Post.countDocuments(filter),
    ]);
    const result = { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.MEDIA);
    return result;
  },

  async listRepliesByUser(authorId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.repliesByUser(authorId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const [comments, total] = await Promise.all([
      Comment.find({ author: authorId }).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("post", "text author createdAt").populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean(),
      Comment.countDocuments({ author: authorId }),
    ]);
    // also populate post author for context
    const populated = await Promise.all(
      comments.map(async (c) => {
        if (c.post && c.post.author) {
          const pa = await User.findById(c.post.author).select("fullName username avatarUrl").lean();
          c.post.author = pa;
        }
        return c;
      })
    );
    const result = { comments: populated, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.REPLIES);
    return result;
  },

  async byHashtag(rawTag, { page = 1, limit = 20 }, viewerId = null) {
    const tag = normalizeHashtag(rawTag);
    if (!tag) throw new AppError("Invalid hashtag", 400, "INVALID_HASHTAG");
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.hashtag(tag, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) {
      if (viewerId && cached.posts.length) {
        const posts = cached.posts.map(p => ({ ...p }));
        const postIds = posts.map((p) => p._id);
        const [likes, reposts] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reposts.map((r) => String(r.post)));
        posts.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
        await attachBookmarked(posts, viewerId);
        await attachPollVotes(posts, viewerId);
        return { ...cached, posts };
      }
      const freshPosts = cached.posts.map((p) => ({ ...p }));
      await attachPollVotes(freshPosts, viewerId || null);
      return { ...cached, posts: freshPosts };
    }
    const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
    const filter = { hashtags: tag };
    if (hidden.length) filter.author = { $nin: hidden };
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner").lean(),
      Post.countDocuments(filter),
    ]);
    if (posts.length && viewerId) {
      const postIds = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
        Repost.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
      await attachBookmarked(posts, viewerId);
      await attachPollVotes(posts, viewerId);
    }
    const result = { tag, posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.HASHTAG);
    return result;
  },

  async trending({ limit = 10, hours = 24 } = {}) {
    const lim = Math.max(1, Math.min(30, Number(limit)));
    const hrs = Math.max(1, Math.min(168, Number(hours)));
    const cacheKey = CacheKeys.trending(lim, hrs);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - hrs * 60 * 60 * 1000);
    const rows = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, hashtags: { $ne: [] } } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: lim },
      { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);
    const result = { tags: rows, windowHours: hrs };
    cache.set(cacheKey, result, TTL.TRENDING);
    return result;
  },
};
