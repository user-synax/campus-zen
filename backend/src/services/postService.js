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
import { pushPostUpdate } from "../routes/sseRoutes.js";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

// Fire-and-forget: notifications + live pushes must never block the
// interaction response. Errors are swallowed (best-effort realtime).
function afterResponse(fn) {
  setImmediate(() => {
    Promise.resolve()
      .then(fn)
      .catch(() => {});
  });
}

// Targeted invalidation for count-only changes. Feed caches carry a 30s TTL
// and clients patch counts live via SSE `post:update`, so we must NOT
// delPattern("feed:*") here — that is what causes a stampede when 100 users
// like at once (every like wipes every feed page).
function invalidatePostCounts(postId) {
  cache.del(CacheKeys.post(postId));
}

// post media limits (per user answers: 25MB / 60s video, GIF as image,
// up to 4 attachments, no transcoding — fast via lazy + poster)
export const MEDIA_LIMITS = {
  MAX_FILES: 4,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  GIF_MAX_BYTES: 10 * 1024 * 1024,
  VIDEO_MAX_BYTES: 25 * 1024 * 1024,
  POSTER_MAX_BYTES: 2 * 1024 * 1024,
  VIDEO_MAX_DURATION_S: 60,
  VIDEO_DURATION_SLACK_S: 2,
};

const ALLOWED_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function kindOf(mime) {
  if (mime === "image/gif") return "gif";
  if (String(mime || "").startsWith("video/")) return "video";
  return "image";
}

// Normalize the many shapes the controller can hand over:
// - legacy single multer file ({ buffer, ... })
// - array of multer files
// - { files, posters, meta } from the multi-field upload
function normalizeMediaInput(input) {
  if (!input) return { files: [], posters: [], meta: [] };
  if (Array.isArray(input)) return { files: input, posters: [], meta: [] };
  if (input.buffer) return { files: [input], posters: [], meta: [] };
  if (input.files || input.posters || input.meta) {
    return {
      files: input.files || [],
      posters: input.posters || [],
      meta: input.meta || [],
    };
  }
  return { files: [], posters: [], meta: [] };
}

function validateMediaFiles(files, meta) {
  if (files.length > MEDIA_LIMITS.MAX_FILES) {
    throw new AppError(`Up to ${MEDIA_LIMITS.MAX_FILES} attachments per post`, 400, "TOO_MANY_FILES");
  }
  const videos = files.filter((f) => String(f.mimetype || "").startsWith("video/"));
  if (videos.length > 1) throw new AppError("Only one video per post", 400, "INVALID_MEDIA");
  if (videos.length === 1 && files.length > 1) {
    throw new AppError("Video can't be combined with other media", 400, "INVALID_MEDIA");
  }
  files.forEach((f, i) => {
    if (!ALLOWED_MEDIA_MIMES.has(f.mimetype)) {
      throw new AppError("Only images, GIFs and videos are allowed", 400, "INVALID_FILE_TYPE");
    }
    const kind = kindOf(f.mimetype);
    const cap =
      kind === "video"
        ? MEDIA_LIMITS.VIDEO_MAX_BYTES
        : kind === "gif"
          ? MEDIA_LIMITS.GIF_MAX_BYTES
          : MEDIA_LIMITS.IMAGE_MAX_BYTES;
    if (f.size > cap) {
      const label = kind === "video" ? "Video must be under 25MB" : kind === "gif" ? "GIF must be under 10MB" : "Image must be under 5MB";
      throw new AppError(label, 400, "FILE_TOO_LARGE");
    }
    const d = Number(meta?.[i]?.duration);
    if (kind === "video" && Number.isFinite(d) && d > 0) {
      if (d > MEDIA_LIMITS.VIDEO_MAX_DURATION_S + MEDIA_LIMITS.VIDEO_DURATION_SLACK_S) {
        throw new AppError("Video must be 60 seconds or less", 400, "VIDEO_TOO_LONG");
      }
    }
  });
}

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
// Batched: single $in query instead of N sequential findOne calls.
async function notifyMentions(actorId, usernames, postId, skipId = null) {
  if (!usernames?.length) return;
  const unique = [...new Set(usernames.map((u) => String(u).toLowerCase()))].slice(0, 10);
  try {
    const users = await User.find({ username: { $in: unique } })
      .select("_id username")
      .lean();
    for (const user of users) {
      try {
        if (String(user._id) === String(actorId)) continue;
        if (skipId && String(user._id) === String(skipId)) continue;
        afterResponse(() =>
          notificationService.create({ recipient: user._id, actor: actorId, type: "mention", post: postId }),
        );
      } catch {}
    }
  } catch {}
}

export const postService = {
  async create(authorId, text, mediaInput, pollInput) {
    const t = text?.trim() || "";
    if (t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    const poll = buildPoll(pollInput);
    const { files, posters, meta } = normalizeMediaInput(mediaInput);
    if (poll && files.length) throw new AppError("Poll and media can't be combined", 400, "INVALID_POLL");
    if (!t && !files.length && !poll) throw new AppError("Post must have text, media or a poll", 400, "EMPTY_POST");
    validateMediaFiles(files, meta);

    let imageUrl = null;
    let media = [];
    if (files.length) {
      const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
      if (!isAppwriteConfigured()) throw new AppError("Media upload not configured", 503, "APPWRITE_NOT_CONFIGURED");
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const kind = kindOf(f.mimetype);
        const up = await uploadToAppwrite(f.buffer, f.originalname, f.mimetype);
        const m = meta?.[i] || {};
        const entry = {
          url: up.viewUrl,
          kind,
          mime: f.mimetype,
          bytes: f.size,
          width: Number(m.width) > 0 ? Math.round(Number(m.width)) : null,
          height: Number(m.height) > 0 ? Math.round(Number(m.height)) : null,
          duration: kind === "video" && Number(m.duration) > 0 ? Number(m.duration) : null,
          posterUrl: null,
          fileId: up.fileId,
          posterFileId: null,
        };
        // Single-video posts may carry one client-generated poster JPEG
        // (first frame, ~640px) so feeds render an image-weight placeholder
        // and never fetch video bytes until play.
        if (kind === "video" && posters?.length) {
          const p = posters[0];
          if (p && p.size <= MEDIA_LIMITS.POSTER_MAX_BYTES && String(p.mimetype || "").startsWith("image/")) {
            const pup = await uploadToAppwrite(p.buffer, p.originalname || "poster.jpg", p.mimetype);
            entry.posterUrl = pup.viewUrl;
            entry.posterFileId = pup.fileId;
          }
        }
        uploaded.push(entry);
      }
      media = uploaded;
      const firstVisual = media.find((m) => m.kind === "image" || m.kind === "gif");
      imageUrl = firstVisual ? firstVisual.url : null;
    }

    const post = await Post.create({ author: authorId, text: t || undefined, imageUrl, media, poll: poll || undefined, hashtags: extractHashtags(t), mentions: extractMentions(t) });
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
    // cleanup media from Appwrite (new media[] + legacy imageUrl)
    try {
      const { deleteFromAppwrite, extractFileId } = await import("../config/appwrite.js");
      const targets = [];
      for (const m of post.media || []) {
        if (m.fileId) targets.push(m.fileId);
        else if (m.url) {
          const id = extractFileId(m.url);
          if (id) targets.push(id);
        }
        if (m.posterFileId) targets.push(m.posterFileId);
        else if (m.posterUrl) {
          const id = extractFileId(m.posterUrl);
          if (id) targets.push(id);
        }
      }
      if (post.imageUrl) {
        const id = extractFileId(post.imageUrl);
        // legacy mirror may duplicate media[0] — dedupe by fileId set
        if (id && !targets.includes(id)) targets.push(id);
      }
      for (const id of targets) await deleteFromAppwrite(id);
    } catch {}
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

  // Explicit idempotent like: POST always ensures liked. Safe under burst:
  // unique index makes the insert the arbiter; only the winner $incs.
  async likePost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    let inserted = false;
    try {
      await Like.create({ user: userId, post: postId });
      inserted = true;
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    let updated;
    if (inserted) {
      updated = await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } }, { new: true }).select("likeCount author");
      if (String(post.author) !== String(userId)) {
        afterResponse(() =>
          notificationService.create({ recipient: post.author, actor: userId, type: "like", post: postId }),
        );
      }
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), likeCount: updated.likeCount }),
      );
    } else {
      updated = await Post.findById(postId).select("likeCount");
    }
    invalidatePostCounts(postId);
    return { liked: true, likeCount: updated.likeCount };
  },

  async unlikePost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    const res = await Like.deleteOne({ user: userId, post: postId });
    let updated;
    if (res.deletedCount > 0) {
      updated = await Post.findOneAndUpdate(
        { _id: postId, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
        { new: true },
      ).select("likeCount");
      if (!updated) updated = await Post.findById(postId).select("likeCount");
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), likeCount: updated.likeCount }),
      );
    } else {
      updated = await Post.findById(postId).select("likeCount");
    }
    invalidatePostCounts(postId);
    return { liked: false, likeCount: updated.likeCount };
  },

  // Kept for backward compat (both POST and DELETE /:id/like route here).
  // Race-safe: duplicate-key races return current state instead of 409.
  async toggleLike(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Like.findOne({ user: userId, post: postId }).select("_id");
    if (existing) return this.unlikePost(userId, postId);
    try {
      return await this.likePost(userId, postId);
    } catch (e) {
      if (e.code === 11000) return this.likePost(userId, postId);
      throw e;
    }
  },

  async repostPost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    let inserted = false;
    try {
      await Repost.create({ user: userId, post: postId });
      inserted = true;
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    let updated;
    if (inserted) {
      updated = await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } }, { new: true }).select("repostCount author");
      if (String(post.author) !== String(userId)) {
        afterResponse(() =>
          notificationService.create({ recipient: post.author, actor: userId, type: "repost", post: postId }),
        );
      }
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), repostCount: updated.repostCount }),
      );
    } else {
      updated = await Post.findById(postId).select("repostCount");
    }
    invalidatePostCounts(postId);
    return { reposted: true, repostCount: updated.repostCount };
  },

  async unrepostPost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    const res = await Repost.deleteOne({ user: userId, post: postId });
    let updated;
    if (res.deletedCount > 0) {
      updated = await Post.findOneAndUpdate(
        { _id: postId, repostCount: { $gt: 0 } },
        { $inc: { repostCount: -1 } },
        { new: true },
      ).select("repostCount");
      if (!updated) updated = await Post.findById(postId).select("repostCount");
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), repostCount: updated.repostCount }),
      );
    } else {
      updated = await Post.findById(postId).select("repostCount");
    }
    invalidatePostCounts(postId);
    return { reposted: false, repostCount: updated.repostCount };
  },

  async toggleRepost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Repost.findOne({ user: userId, post: postId }).select("_id");
    if (existing) return this.unrepostPost(userId, postId);
    try {
      return await this.repostPost(userId, postId);
    } catch (e) {
      if (e.code === 11000) return this.repostPost(userId, postId);
      throw e;
    }
  },

  async bookmarkPost(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    try {
      await Bookmark.create({ user: userId, post: postId });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    cache.del(CacheKeys.post(postId));
    cache.delPattern(`bookmarks:${userId}:*`);
    return { bookmarked: true };
  },

  async unbookmarkPost(userId, postId) {
    await Bookmark.deleteOne({ user: userId, post: postId });
    cache.del(CacheKeys.post(postId));
    cache.delPattern(`bookmarks:${userId}:*`);
    return { bookmarked: false };
  },

  async toggleBookmark(userId, postId) {
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Bookmark.findOne({ user: userId, post: postId }).select("_id");
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      cache.del(CacheKeys.post(postId));
      cache.delPattern(`bookmarks:${userId}:*`);
      return { bookmarked: false };
    }
    try {
      await Bookmark.create({ user: userId, post: postId });
    } catch (e) {
      if (e.code === 11000) return { bookmarked: true };
      throw e;
    }
    cache.del(CacheKeys.post(postId));
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
    const post = await Post.findById(postId).select("author");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Reply must be 1-500 characters", 400, "INVALID_TEXT");
    const mentions = extractMentions(t);
    const comment = await Comment.create({ post: postId, author: userId, text: t, mentions });
    const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { replyCount: 1 } }, { new: true }).select("replyCount author");
    if (String(post.author) !== String(userId)) {
      afterResponse(() =>
        notificationService.create({ recipient: post.author, actor: userId, type: "reply", post: postId }),
      );
    }
    // mention notifications for everyone tagged except the post author
    // (they already get a reply notification above) — fire-and-forget
    afterResponse(() => notifyMentions(userId, mentions, postId, post.author));
    afterResponse(() =>
      pushPostUpdate(post.author, { postId: String(postId), replyCount: updatedPost.replyCount }),
    );
    // Invalidate only post + comments; feeds patch replyCount live via SSE
    cache.del(CacheKeys.post(postId));
    cache.delPattern(`comments:${postId}:*`);
    const populated = await Comment.findById(comment._id).populate("author", "fullName username avatarUrl isEmailVerified isPro isOwner");
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

  // media posts by author for the profile Media tab — light payload for the grid.
  // Matches legacy imageUrl posts and new media[] posts (images, GIFs, videos).
  async mediaByAuthor(authorId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.mediaByAuthor(authorId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const filter = {
      author: authorId,
      $or: [{ imageUrl: { $ne: null } }, { "media.0": { $exists: true } }],
    };
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .select("_id imageUrl media text createdAt likeCount replyCount repostCount")
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
    // also populate post author for context — single $in query, no N+1
    const postAuthorIds = [...new Set(comments.map((c) => String(c.post?.author)).filter(Boolean))];
    if (postAuthorIds.length) {
      const authors = await User.find({ _id: { $in: postAuthorIds } })
        .select("fullName username avatarUrl")
        .lean();
      const authorMap = new Map(authors.map((a) => [String(a._id), a]));
      for (const c of comments) {
        if (c.post?.author && authorMap.has(String(c.post.author))) {
          c.post.author = authorMap.get(String(c.post.author));
        }
      }
    }
    const result = { comments, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
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
