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
import {
  ARTICLE_BODY_MAX,
  ARTICLE_DESC_MAX,
  ARTICLE_TITLE_MAX,
  buildArticleTeaser,
  extractArticleMentions,
  isValidArticleSlug,
  slugifyArticle,
} from "../utils/articles.js";
import { AppError } from "../utils/AppError.js";
import { cache, CacheKeys, TTL } from "../utils/cache.js";
import {
  decodeCursor,
  encodeCursor,
  encodeKeysetCursor,
  orderIds,
  resolveFeedState,
} from "../utils/feedOrder.js";
import { pushPostUpdate } from "../routes/sseRoutes.js";
import { generateAnonAlias, aliasForThreadMember, maskAnonAuthor } from "../utils/anon.js";
import { normalizeInterestTags, isInterestTag } from "../utils/interestTags.js";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

// Upper bound on candidate posts considered when building a shuffled cursor
// feed order (newest first). Bounds rebuild cost + RAM for the memoized order
// lists on the Render free tier; 20k posts ≈ 1k scroll pages.
const FEED_CANDIDATE_CAP = 20_000;

// ─── Anonymous hub helpers ──────────────────────────────────────────────
// Real author ObjectId is always stored for moderation/abuse handling.
// API output masks it: author replaced with alias, isOwn computed for the viewer.
function sanitizeAnonPost(post, viewerId) {
  if (!post || !post.isAnonymous) return post;
  const realAuthorId = post.author?._id || post.author;
  const isOwn = viewerId ? String(viewerId) === String(realAuthorId) : false;
  const alias = post.anonAlias || "Anonymous";
  return {
    ...post,
    author: maskAnonAuthor(alias),
    anonAlias: alias,
    isOwn,
    // hub supports like + reply + view only — never surface repost/bookmark
    isReposted: false,
    isBookmarked: false,
    repostCount: 0,
    poll: null,
    myVote: null,
  };
}

function sanitizeAnonPosts(posts, viewerId) {
  if (!posts?.length) return posts;
  return posts.map((p) => sanitizeAnonPost(p, viewerId));
}

function maskAnonComment(comment, post, viewerId) {
  if (!comment) return comment;
  const realAuthorId = comment.author?._id || comment.author;
  const isOp = String(realAuthorId) === String(post.author?._id || post.author);
  const alias = isOp
    ? `${post.anonAlias || "Anonymous"} · OP`
    : aliasForThreadMember(post._id, realAuthorId);
  return {
    ...comment,
    author: maskAnonAuthor(alias),
    anonAlias: alias,
    isOp,
    isOwn: viewerId ? String(viewerId) === String(realAuthorId) : false,
  };
}

function maskAnonComments(comments, post, viewerId) {
  if (!comments?.length) return comments;
  return comments.map((c) => maskAnonComment({ ...c }, post, viewerId));
}

// Non-anonymous filter — every normal surface must exclude hub posts.
const NOT_ANON = { isAnonymous: { $ne: true } };

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

// strip posts whose author is blocked (either direction) or hidden by
// strict-private / deactivation rules from a fetched list
async function withoutBlockedAuthors(posts, viewerId) {
  if (!posts.length) return posts;
  const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
  let privateHide = [];
  try {
    const { privacyService } = await import("./privacyService.js");
    const set = await privacyService.privateIdsToHide(viewerId || null);
    privateHide = [...set];
  } catch {}
  if (!hidden.length && !privateHide.length) return posts;
  const set = new Set([...hidden.map(String), ...privateHide.map(String)]);
  return posts.filter((p) => !set.has(String(p.author?._id || p.author)));
}

// Combined hidden-author filter for Mongo queries (blocked + private + deactivated).
async function hiddenAuthorFilter(viewerId) {
  const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
  let privateHide = [];
  try {
    const { privacyService } = await import("./privacyService.js");
    const set = await privacyService.privateIdsToHide(viewerId || null);
    privateHide = [...set];
  } catch {}
  const all = new Set([...hidden.map(String), ...privateHide.map(String)]);
  return all;
}

// ─── Cursor/paginated feeds (For you = seeded random order) ────────────────
// Per-viewer visibility strip shared by the legacy offset publicFeed and the
// new cursor feed: blocked/deactivated authors gone, private authors only
// for self/followers (legacy discovery included followed privates).
async function stripViewerHiddenPosts(posts, viewerId) {
  if (!posts.length) return posts;
  let out = await withoutBlockedAuthors(posts, viewerId);
  // Guests + non-followers: drop private authors (belt-and-braces).
  out = out.filter((p) => {
    const a = p.author;
    if (!a) return true;
    if (a.isPrivate && String(a._id || a) !== String(viewerId || "")) return false;
    return true;
  });
  return out;
}

// One place for the per-viewer feed plumbing: isLiked/isReposted/isBookmarked
// + viewer poll state. Same flags the page feeds attach, just shared.
async function hydrateFeedPosts(posts, viewerId) {
  if (viewerId && posts.length) {
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
  }
  await attachPollVotes(posts, viewerId || null);
}

// Deterministic per-seed shuffle of candidate IDs, memoized. Recompute is a
// single covered index scan (_id projection, no full docs) + in-memory hash
// sort; the memoized list makes every page 2+ a pure RAM slice with zero
// sorting/resampling on the DB. Only ~10 min TTL — a normal scroll session
// rarely rebuilds, and the cursor's lastId anchor bridges any rebuild.
async function getShuffledOrderList(cacheKey, seed, buildCandidates) {
  let order = cache.get(cacheKey);
  if (order) return order;
  const rows = await buildCandidates();
  order = orderIds(seed, rows.map((d) => String(d._id)));
  cache.set(cacheKey, order, TTL.FEED_ORDER);
  return order;
}

// Consume the next window of an order list: hydrate live posts with one $in
// per ::lim slice, keeping the shuffled order. Deleted posts mid-session
// shrink a slice; we roll into later chunks until the page fills or the list
// is exhausted. `end` = candidate index AFTER the last consumed candidate —
// that's the next page's start anchor.
async function consumeOrderSlice(order, start, lim, queryFilter, authorProjection) {
  const picked = [];
  let k = Math.max(0, Math.min(start, order.length));
  while (k < order.length && picked.length < lim) {
    const chunk = order.slice(k, k + lim);
    if (!chunk.length) break;
    const rows = await Post.find({ _id: { $in: chunk }, ...queryFilter })
      .populate("author", authorProjection)
      .lean();
    const byId = new Map(rows.map((r) => [String(r._id), r]));
    for (const id of chunk) {
      const post = byId.get(id);
      if (post) picked.push(post);
      k += 1;
      if (picked.length === lim) break;
    }
  }
  return { posts: picked, end: k };
}

// Shared "nextCursor" assembly for both cursor feeds.
function cursorPageResult(state, orderLength, end, posts, lim) {
  const hasMore = end < orderLength;
  const lastShown = posts.length ? String(posts[posts.length - 1]._id) : "";
  return {
    posts,
    limit: lim,
    hasMore,
    // seed rides inside the cursor; expose it too so clients can rehydrate
    // the same session without holding the cursor around (freshness polls).
    seed: state.seed,
    nextCursor: hasMore
      ? encodeCursor({ seed: state.seed, start: end, lastId: lastShown || state.lastId })
      : null,
  };
}

// Enforce mention policy before creating content — hard 403 with clear code.
async function assertMentionsAllowed(actorId, usernames) {
  if (!usernames?.length) return;
  const unique = [...new Set(usernames.map((u) => String(u).toLowerCase()))].slice(0, 10);
  if (!unique.length) return;
  const users = await User.find({ username: { $in: unique } })
    .select("_id username mentionPolicy")
    .lean();
  const { privacyService } = await import("./privacyService.js");
  for (const u of users) {
    const gate = await privacyService.mentionGate(actorId, u);
    if (gate) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError(gate.message, gate.status, gate.code);
    }
  }
}

// Enforce private/deactivated visibility for a single post author.
// Throws 404 POST_NOT_FOUND when hidden (indistinguishable from deleted).
async function assertCanSeePost(viewerId, authorId, authorDoc = null) {
  const { AppError } = await import("../utils/AppError.js");
  let author = authorDoc;
  if (!author) {
    author = await User.findById(authorId).select("_id isPrivate isDeactivated").lean();
  }
  if (!author) return;
  if (author.isDeactivated && String(viewerId || "") !== String(author._id)) {
    throw new AppError("Post not found", 404, "POST_NOT_FOUND");
  }
  if (author.isPrivate) {
    if (!viewerId) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(viewerId) !== String(author._id)) {
      const { Follow } = await import("../models/Follow.js");
      const ok = await Follow.exists({ follower: viewerId, following: author._id });
      if (!ok) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
  }
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

async function ensureUniqueArticleSlug(authorId, baseSlug) {
  let slug = baseSlug;
  for (let i = 0; i < 20; i++) {
    const exists = await Post.exists({ author: authorId, slug, kind: "article" });
    if (!exists) return slug;
    slug = `${baseSlug}-${i + 2}`.slice(0, 100);
  }
  return `${baseSlug}-${Date.now().toString(36)}`.slice(0, 100);
}

function invalidateArticleCaches(authorId, username, slug) {
  cache.delPattern("feed:*");
  cache.delPattern("publicFeed:*");
  cache.delPattern(`userPosts:${authorId}:*`);
  cache.delPattern(`userArticles:${authorId}:*`);
  cache.delPattern("articles:*");
  cache.delPattern("trending:*");
  cache.delPattern("hashtag:*");
  cache.delPattern(`media:${authorId}:*`);
  if (username && slug) cache.del(CacheKeys.article(username, slug));
}

async function uploadMediaFiles(files, posters, meta) {
  if (!files.length) return { media: [], imageUrl: null };
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
  const firstVisual = uploaded.find((mm) => mm.kind === "image" || mm.kind === "gif");
  return { media: uploaded, imageUrl: firstVisual ? firstVisual.url : null };
}

export const postService = {
  async create(authorId, text, mediaInput, pollInput, opts = {}) {
    const t = text?.trim() || "";
    if (t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    // 1-3 interest tags required — they route the post into the Interest Hub
    const interestTags = normalizeInterestTags(opts?.interestTags);
    const poll = buildPoll(pollInput);
    const { files, posters, meta } = normalizeMediaInput(mediaInput);
    if (poll && files.length) throw new AppError("Poll and media can't be combined", 400, "INVALID_POLL");
    if (!t && !files.length && !poll) throw new AppError("Post must have text, media or a poll", 400, "EMPTY_POST");
    validateMediaFiles(files, meta);
    await assertMentionsAllowed(authorId, extractMentions(t));
    const { media, imageUrl } = await uploadMediaFiles(files, posters, meta);
    const articleRefs = extractArticleMentions(t).map((r) => r.key);
    const isSensitive = Boolean(opts?.isSensitive);

    const post = await Post.create({
      author: authorId,
      kind: "post",
      text: t || undefined,
      imageUrl,
      media,
      poll: poll || undefined,
      hashtags: extractHashtags(t),
      mentions: extractMentions(t),
      articleMentions: articleRefs,
      interestTags,
      isSensitive,
      isAnonymous: false,
    });
    // Invalidate caches that include this post
    await User.findByIdAndUpdate(authorId, { $inc: { postCount: 1 } });
    await notifyMentions(authorId, extractMentions(t), post._id);
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${authorId}:*`);
    cache.delPattern("articles:*");
    cache.delPattern("trending:*");
    cache.delPattern("hashtag:*");
    cache.delPattern(`media:${authorId}:*`);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder");
    return populated;
  },

  // Anonymous hub — text + images only. Same 500-char / image validation as
  // normal posts, but no polls, no video/gif, no @mentions.
  // Never touches postCount / profile caches — hub-only by design.
  async createAnonymous(authorId, text, mediaInput, opts = {}) {
    const t = text?.trim() || "";
    if (t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    if (opts?.poll) throw new AppError("Polls aren't allowed in anonymous posts", 400, "ANON_NO_POLL");
    const { files, posters, meta } = normalizeMediaInput(mediaInput);
    if (!t && !files.length) throw new AppError("Post must have text or an image", 400, "EMPTY_POST");
    validateMediaFiles(files, meta);
    for (const f of files) {
      const mime = String(f.mimetype || "");
      const isImage = mime.startsWith("image/") && mime !== "image/gif";
      if (!isImage) throw new AppError("Only text and images are allowed in anonymous posts", 400, "INVALID_MEDIA");
    }
    const mentions = extractMentions(t);
    if (mentions.length) throw new AppError("@mentions aren't allowed in anonymous posts", 400, "ANON_NO_MENTIONS");
    const { media, imageUrl } = await uploadMediaFiles(files, posters, meta);
    const isSensitive = Boolean(opts?.isSensitive);
    const alias = generateAnonAlias(`${authorId}:${Date.now()}:${Math.random()}`);
    const post = await Post.create({
      author: authorId,
      kind: "post",
      text: t || undefined,
      imageUrl,
      media,
      hashtags: extractHashtags(t),
      mentions: [],
      articleMentions: extractArticleMentions(t).map((r) => r.key),
      isSensitive,
      isAnonymous: true,
      anonAlias: alias,
    });
    cache.delPattern("anonFeed:*");
    cache.del(CacheKeys.post(post._id));
    const created = await Post.findById(post._id).populate("author", "fullName username avatarUrl").lean();
    return sanitizeAnonPost(created, authorId);
  },

  async anonymousFeed(userId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.anonFeed(page, lim);
    const cached = cache.get(cacheKey);
    if (cached) {
      const posts = sanitizeAnonPosts(cached.posts.map((p) => ({ ...p })), userId);
      if (userId && posts.length) {
        const ids = posts.map((p) => p._id);
        const likes = await Like.find({ user: userId, post: { $in: ids } }).select("post").lean();
        const set = new Set(likes.map((l) => String(l.post)));
        posts.forEach((p) => { p.isLiked = set.has(String(p._id)); });
      }
      return { ...cached, posts };
    }
    const hiddenSet = await hiddenAuthorFilter(userId);
    const filter = { isAnonymous: true, kind: "post" };
    if (hiddenSet.size) filter.author = { $nin: [...hiddenSet] };
    const raw = await Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim + 1)
      .populate("author", "fullName username avatarUrl").lean();
    const hasMore = raw.length > lim;
    if (hasMore) raw.pop();
    const posts = sanitizeAnonPosts(raw, userId);
    if (posts.length && userId) {
      const ids = posts.map((p) => p._id);
      const likes = await Like.find({ user: userId, post: { $in: ids } }).select("post").lean();
      const set = new Set(likes.map((l) => String(l.post)));
      posts.forEach((p) => { p.isLiked = set.has(String(p._id)); });
    }
    const result = { posts, page: Number(page), limit: lim, hasMore };
    cache.set(cacheKey, { posts: raw, page: Number(page), limit: lim, hasMore }, TTL.FEED);
    return result;
  },

  async getById(postId, viewerId) {
    const cacheKey = CacheKeys.post(postId);
    let post = cache.get(cacheKey);

    if (!post) {
      post = await Post.findById(postId).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate").lean();
      if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
      cache.set(cacheKey, post, TTL.POST);
    }

    // blocked in either direction → indistinguishable from deleted
    if (viewerId) {
      const authorId = post.author?._id || post.author;
      if (await blockService.isBlocked(viewerId, authorId)) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    // strict private + deactivated → skipped for anonymous hub (author hidden,
    // hub is login-gated). Normal posts keep existing behavior.
    if (!post.isAnonymous) {
      const authorId = post.author?._id || post.author;
      const authorDoc = typeof post.author === "object" ? null : null;
      // Fetch privacy flags (cached post may lack them).
      await assertCanSeePost(viewerId, authorId, authorDoc);
    }
    // Clone to avoid mutating cached object
    const result = { ...post };
    if (!result.isAnonymous) {
      await attachPollVotes([result], viewerId);
    } else {
      result.poll = null;
      result.myVote = null;
    }
    if (viewerId) {
      const [liked, reposted, bookmarked] = await Promise.all([
        Like.exists({ user: viewerId, post: postId }),
        result.isAnonymous ? null : Repost.exists({ user: viewerId, post: postId }),
        result.isAnonymous ? null : Bookmark.exists({ user: viewerId, post: postId }),
      ]);
      result.isLiked = Boolean(liked);
      result.isReposted = Boolean(reposted);
      result.isBookmarked = Boolean(bookmarked);
    }
    if (result.isAnonymous) return sanitizeAnonPost(result, viewerId);
    return result;
  },

  async update(postId, userId, text) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to edit this post", 403, "FORBIDDEN");
    if (post.kind === "article") {
      throw new AppError("Use article update for articles", 400, "USE_ARTICLE_UPDATE");
    }
    if (Date.now() - new Date(post.createdAt).getTime() > EDIT_WINDOW_MS) throw new AppError("Edit window expired (5 minutes)", 403, "EDIT_WINDOW_EXPIRED");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    if (post.isAnonymous) {
      if (extractMentions(t).length) throw new AppError("@mentions aren't allowed in anonymous posts", 400, "ANON_NO_MENTIONS");
      post.text = t;
      post.hashtags = extractHashtags(t);
      post.mentions = [];
      post.articleMentions = extractArticleMentions(t).map((r) => r.key);
      post.edited = true;
      await post.save();
      cache.del(CacheKeys.post(postId));
      cache.delPattern("anonFeed:*");
      const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl").lean();
      return sanitizeAnonPost(populated, userId);
    }
    const oldMentions = new Set((post.mentions || []).map((m) => String(m).toLowerCase()));
    const newMentions = extractMentions(t);
    const added = newMentions.filter((m) => !oldMentions.has(m));
    await assertMentionsAllowed(userId, added);
    post.text = t;
    post.hashtags = extractHashtags(t);
    post.mentions = newMentions;
    post.articleMentions = extractArticleMentions(t).map((r) => r.key);
    post.edited = true;
    await post.save();
    await notifyMentions(userId, added, post._id);
    // Invalidate caches
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern(`userPosts:${post.author}:*`);
    cache.delPattern("hashtag:*");
    cache.delPattern(`media:${post.author}:*`);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder");
    return populated;
  },

  async createArticle(authorId, { title, description, body }, mediaInput, opts = {}) {
    const t = String(title || "").trim();
    const d = String(description || "").trim();
    const b = String(body || "").trim();
    if (!t || t.length > ARTICLE_TITLE_MAX) throw new AppError(`Title must be 1-${ARTICLE_TITLE_MAX} characters`, 400, "INVALID_TITLE");
    if (d.length > ARTICLE_DESC_MAX) throw new AppError(`Description max ${ARTICLE_DESC_MAX} characters`, 400, "INVALID_DESCRIPTION");
    if (!b || b.length > ARTICLE_BODY_MAX) throw new AppError(`Article body must be 1-${ARTICLE_BODY_MAX} characters`, 400, "INVALID_BODY");
    const { files, posters, meta } = normalizeMediaInput(mediaInput);
    if (files.length) validateMediaFiles(files, meta);
    const combined = `${t}\n${d}\n${b}`;
    await assertMentionsAllowed(authorId, extractMentions(combined));
    const { media, imageUrl } = await uploadMediaFiles(files, posters, meta);
    const baseSlug = slugifyArticle(t);
    const slug = await ensureUniqueArticleSlug(authorId, baseSlug);
    const teaser = buildArticleTeaser(d, b);
    const articleRefs = extractArticleMentions(combined).map((r) => r.key);
    const isSensitive = Boolean(opts?.isSensitive);
    const post = await Post.create({
      author: authorId,
      kind: "article",
      title: t,
      description: d || undefined,
      body: b,
      slug,
      text: teaser || undefined,
      imageUrl,
      media,
      hashtags: extractHashtags(combined),
      mentions: extractMentions(combined),
      articleMentions: articleRefs,
      isSensitive,
    });
    await User.findByIdAndUpdate(authorId, { $inc: { postCount: 1 } });
    await notifyMentions(authorId, extractMentions(combined), post._id);
    invalidateArticleCaches(authorId, null, null);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder");
    return { post: populated, slug };
  },

  async updateArticle(postId, userId, { title, description, body }) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to edit this article", 403, "FORBIDDEN");
    if (post.kind !== "article") throw new AppError("Not an article", 400, "NOT_ARTICLE");
    if (title !== undefined) {
      const t = String(title || "").trim();
      if (!t || t.length > ARTICLE_TITLE_MAX) throw new AppError(`Title must be 1-${ARTICLE_TITLE_MAX} characters`, 400, "INVALID_TITLE");
      post.title = t;
    }
    if (description !== undefined) {
      const d = String(description || "").trim();
      if (d.length > ARTICLE_DESC_MAX) throw new AppError(`Description max ${ARTICLE_DESC_MAX} characters`, 400, "INVALID_DESCRIPTION");
      post.description = d || undefined;
    }
    if (body !== undefined) {
      const b = String(body || "").trim();
      if (!b || b.length > ARTICLE_BODY_MAX) throw new AppError(`Article body must be 1-${ARTICLE_BODY_MAX} characters`, 400, "INVALID_BODY");
      post.body = b;
    }
    const combined = `${post.title || ""}\n${post.description || ""}\n${post.body || ""}`;
    const newMentions = extractMentions(combined);
    const oldMentions = new Set((post.mentions || []).map((m) => String(m).toLowerCase()));
    const added = newMentions.filter((m) => !oldMentions.has(m));
    await assertMentionsAllowed(userId, added);
    post.text = buildArticleTeaser(post.description, post.body) || undefined;
    post.hashtags = extractHashtags(combined);
    post.mentions = newMentions;
    post.articleMentions = extractArticleMentions(combined).map((r) => r.key);
    post.edited = true;
    await post.save();
    await notifyMentions(userId, added, post._id);
    cache.del(CacheKeys.post(postId));
    const authorUser = await User.findById(post.author).select("username").lean();
    invalidateArticleCaches(post.author, authorUser?.username, post.slug);
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder");
    return populated;
  },

  async getArticleBySlug(username, slug, viewerId) {
    const uname = String(username || "").toLowerCase().trim();
    const s = String(slug || "").toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) throw new AppError("Invalid username", 400, "INVALID_USERNAME");
    if (!isValidArticleSlug(s)) throw new AppError("Invalid slug", 400, "INVALID_SLUG");
    const cacheKey = CacheKeys.article(uname, s);
    let cached = cache.get(cacheKey);
    let post = null;
    if (cached) {
      post = cached;
    } else {
      const user = await User.findOne({ username: uname }).select("_id username").lean();
      if (!user) throw new AppError("Article not found", 404, "ARTICLE_NOT_FOUND");
      post = await Post.findOne({ author: user._id, slug: s, kind: "article" })
        .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate")
        .lean();
      if (!post) throw new AppError("Article not found", 404, "ARTICLE_NOT_FOUND");
      cache.set(cacheKey, post, TTL.POST);
    }
    if (viewerId) {
      const authorId = post.author?._id || post.author;
      if (await blockService.isBlocked(viewerId, authorId)) throw new AppError("Article not found", 404, "ARTICLE_NOT_FOUND");
    }
    await assertCanSeePost(viewerId, post.author?._id || post.author);
    const result = { ...post };
    if (viewerId) {
      const [liked, reposted, bookmarked] = await Promise.all([
        Like.exists({ user: viewerId, post: post._id }),
        Repost.exists({ user: viewerId, post: post._id }),
        Bookmark.exists({ user: viewerId, post: post._id }),
      ]);
      result.isLiked = Boolean(liked);
      result.isReposted = Boolean(reposted);
      result.isBookmarked = Boolean(bookmarked);
    }
    return result;
  },

  async listArticles({ page = 1, limit = 20 }, viewerId) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.articleList(page, lim);
    const cached = cache.get(cacheKey);
    const attachFlags = async (posts) => {
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
        await attachBookmarked(posts, viewerId);
      }
      return posts;
    };
    if (cached) {
      const posts = (cached.posts || []).map((p) => ({ ...p }));
      const visible = await withoutBlockedAuthors(posts, viewerId);
      await attachFlags(visible);
      return { ...cached, posts: visible };
    }
    const hiddenSet = await hiddenAuthorFilter(viewerId);
    const filter = { kind: "article" };
    if (hiddenSet.size) filter.author = { $nin: [...hiddenSet] };
    const [raw, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate").lean(),
      Post.countDocuments(filter),
    ]);
    let posts = await withoutBlockedAuthors(raw, viewerId);
    posts = posts.filter((p) => !p.author?.isPrivate || String(p.author?._id) === String(viewerId || ""));
    await attachFlags(posts);
    const result = { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, { ...result, posts: raw }, TTL.FEED);
    return result;
  },

  async lookupArticles(refs, viewerId) {
    if (!Array.isArray(refs) || !refs.length) return { articles: [] };
    const clean = refs.slice(0, 10).map((r) => ({
      username: String(r.username || "").toLowerCase(),
      slug: String(r.slug || "").toLowerCase(),
    })).filter((r) => /^[a-z0-9_]{3,20}$/.test(r.username) && isValidArticleSlug(r.slug));
    if (!clean.length) return { articles: [] };
    const usernames = [...new Set(clean.map((r) => r.username))];
    const users = await User.find({ username: { $in: usernames } }).select("_id username").lean();
    const userMap = new Map(users.map((u) => [u.username.toLowerCase(), u]));
    const or = [];
    for (const r of clean) {
      const u = userMap.get(r.username);
      if (u) or.push({ author: u._id, slug: r.slug, kind: "article" });
    }
    if (!or.length) return { articles: [] };
    const posts = await Post.find({ $or: or })
      .select("title description body text slug author createdAt likeCount replyCount repostCount")
      .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate")
      .lean();
    const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
    const hideSet = new Set(hidden.map(String));
    const out = [];
    for (const p of posts) {
      if (hideSet.has(String(p.author?._id || p.author))) continue;
      const excerpt = (p.description || "").trim() || buildArticleTeaser("", p.body || "").slice(0, 200);
      out.push({
        _id: p._id,
        username: p.author?.username,
        slug: p.slug,
        key: `${p.author?.username?.toLowerCase()}/${p.slug}`,
        title: p.title,
        description: excerpt,
        likeCount: p.likeCount,
        replyCount: p.replyCount,
        createdAt: p.createdAt,
        author: { username: p.author?.username, fullName: p.author?.fullName, avatarUrl: p.author?.avatarUrl },
      });
    }
    return { articles: out };
  },

  async remove(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to delete this post", 403, "FORBIDDEN");
    const wasAnon = Boolean(post.isAnonymous);
    await Post.deleteOne({ _id: postId });
    await Promise.all([
      wasAnon ? Promise.resolve() : User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } }),
      User.updateOne({ _id: userId, pinnedPost: postId }, { $unset: { pinnedPost: 1 } }),
      Comment.deleteMany({ post: postId }),
      Like.deleteMany({ post: postId }),
      Repost.deleteMany({ post: postId }),
      Bookmark.deleteMany({ post: postId }),
      PollVote.deleteMany({ post: postId }),
      (await import("../models/PostView.js")).PostView.deleteMany({ post: postId }),
    ]);
    // clamp
    if (!wasAnon) await User.updateOne({ _id: userId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
    // Invalidate caches
    cache.del(CacheKeys.post(postId));
    cache.delPattern("feed:*");
    cache.delPattern("publicFeed:*");
    cache.delPattern("anonFeed:*");
    cache.delPattern(`userPosts:${userId}:*`);
    cache.delPattern(`userArticles:${userId}:*`);
    cache.delPattern("articles:*");
    if (post.kind === "article") {
      try {
        const u = await User.findById(post.author).select("username").lean();
        if (u?.username && post.slug) cache.del(CacheKeys.article(u.username, post.slug));
      } catch {}
    }
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

    // get following ids + self, minus blocked/hidden authors
    const follows = await Follow.find({ follower: userId }).select("following").lean();
    const ids = follows.map((f) => f.following);
    ids.push(userId);
    const hiddenSet = await hiddenAuthorFilter(userId);
    const visibleIds = ids.filter((id) => !hiddenSet.has(String(id)));
    const authorFilter = { $in: visibleIds.length ? visibleIds : ["000000000000000000000000"] };
    // limit+1 probe instead of a second countDocuments scan — one query per
    // page instead of two (free-tier Mongo thanks us on every scroll)
    const posts = await Post.find({ author: authorFilter, ...NOT_ANON })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim + 1)
      .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
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
    // Per-viewer strip helper (private/blocked/deactivated never in discovery).
    const stripForViewer = (posts) => stripViewerHiddenPosts(posts, viewerId);
    if (cached) {
      // Still need per-viewer data even on cache hit
      if (viewerId && cached.posts.length) {
        let posts = cached.posts.map(p => ({ ...p })); // shallow clone
        posts = await stripForViewer(posts);
        const postIds = posts.map((p) => p._id);
        if (postIds.length) {
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
        return { ...cached, posts };
      }
      const freshPosts = await stripForViewer(cached.posts.map((p) => ({ ...p })));
      await attachPollVotes(freshPosts, viewerId || null);
      return { ...cached, posts: freshPosts };
    }

    const hiddenSet = await hiddenAuthorFilter(viewerId);
    const filter = hiddenSet.size ? { author: { $nin: [...hiddenSet] }, ...NOT_ANON } : { ...NOT_ANON };
    // same limit+1 probe as feed — no countDocuments scan per scroll page
    const raw = await Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim + 1).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate").lean();
    const hasMore = raw.length > lim;
    if (hasMore) raw.pop();
    const posts = await stripForViewer(raw);
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

  // ─── Cursor feeds (web): pagination moves to opaque cursors so offset
  // shifts (new/deleted posts mid-scroll) can't duplicate or skip posts, and
  // "For you" additionally re-arranges per user per session via a seeded
  // shuffle (see utils/feedOrder.js). Following stays chronological but gains
  // the same cursor mechanics. The legacy page paths above are kept for the
  // mobile app until it migrates.
  async feedCursor(userId, { cursor, limit, latest }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    if (latest === "1") return this.feedLatestPeek(userId, lim);
    // following stays newest-first — true keyset over (createdAt, _id), no
    // order list, no randomness. Keyset is insert-safe (new posts always sort
    // AFTER the cursor, so they never re-shown) and re-evaluates blocks/
    // hides per page instead of waiting out a cached snapshot.
    let bound = null;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed?.kind === "keyset") bound = parsed;
    }
    const follows = await Follow.find({ follower: userId }).select("following").lean();
    const ids = follows.map((f) => f.following);
    ids.push(userId);
    const hiddenSet = await hiddenAuthorFilter(userId);
    const visibleIds = ids.filter((id) => !hiddenSet.has(String(id)));
    const filter = { author: { $in: visibleIds.length ? visibleIds : ["000000000000000000000000"] }, ...NOT_ANON };
    if (bound) {
      filter.$or = [
        { createdAt: { $lt: new Date(bound.createdAtMs) } },
        { createdAt: new Date(bound.createdAtMs), _id: { $lt: bound.lastId } },
      ];
    }
    // limit+1 probe instead of a second countDocuments scan (same trick the
    // legacy page feed uses — one query per page).
    const rows = await Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(lim + 1)
      .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
      .lean();
    const hasMore = rows.length > lim;
    if (hasMore) rows.pop();
    await hydrateFeedPosts(rows, userId);
    const last = rows[rows.length - 1];
    return {
      posts: rows,
      limit: lim,
      hasMore,
      nextCursor: hasMore
        ? encodeKeysetCursor({ createdAtMs: new Date(last.createdAt).getTime(), lastId: String(last._id) })
        : null,
    };
  },

  async publicFeedCursor({ cursor, seed, limit, latest }, viewerId) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    if (latest === "1") return this.publicLatestPeek(lim, viewerId);
    const state = resolveFeedState(cursor, seed);
    const order = await getShuffledOrderList(CacheKeys.publicFeedOrder(state.seed), state.seed, () =>
      // candidates = every non-anonymous post/article, newest-first cap. The
      // _id-only projection rides the {kind, createdAt} / isAnonymous index —
      // covered scan, no document fetches. Per-viewer stripping happens per
      // request, like the legacy feed.
      Post.find(NOT_ANON)
        .sort({ createdAt: -1 })
        .limit(FEED_CANDIDATE_CAP)
        .select("_id")
        .lean(),
    );
    let { start } = state;
    if (state.lastId) {
      const idx = order.indexOf(state.lastId);
      if (idx >= 0) start = idx + 1;
    }
    const { posts, end } = await consumeOrderSlice(order, start, lim, NOT_ANON, "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate");
    const visible = await stripViewerHiddenPosts(posts, viewerId);
    await hydrateFeedPosts(visible, viewerId);
    return cursorPageResult(state, order.length, end, visible, lim);
  },

  // Cheap chronological "any new posts?" peeks used by the 30s freshness poll.
  // The banner logic only needs the newest few IDs — random session order is
  // irrelevant there, so these stay shared-cache chronological and tiny.
  async publicLatestPeek(lim, viewerId) {
    const cacheKey = CacheKeys.latestPublic(lim);
    let raw = cache.get(cacheKey);
    if (!raw) {
      raw = await Post.find(NOT_ANON)
        .sort({ createdAt: -1, _id: -1 })
        .limit(lim)
        .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate")
        .lean();
      cache.set(cacheKey, raw, TTL.LATEST);
    }
    const posts = await stripViewerHiddenPosts(raw.map((p) => ({ ...p })), viewerId);
    await hydrateFeedPosts(posts, viewerId);
    return { posts, hasMore: false };
  },

  async feedLatestPeek(userId, lim) {
    const cacheKey = CacheKeys.feedLatest(userId, lim);
    let raw = cache.get(cacheKey);
    if (!raw) {
      const follows = await Follow.find({ follower: userId }).select("following").lean();
      const ids = follows.map((f) => f.following);
      ids.push(userId);
      const hiddenSet = await hiddenAuthorFilter(userId);
      const visibleIds = ids.filter((id) => !hiddenSet.has(String(id)));
      const authorFilter = { $in: visibleIds.length ? visibleIds : ["000000000000000000000000"] };
      raw = await Post.find({ author: authorFilter, ...NOT_ANON })
        .sort({ createdAt: -1, _id: -1 })
        .limit(lim)
        .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
        .lean();
      cache.set(cacheKey, raw, TTL.LATEST);
    }
    const posts = raw.map((p) => ({ ...p }));
    await hydrateFeedPosts(posts, userId);
    return { posts, hasMore: false };
  },

  // ─── Interest Hub (v1 taxonomy — utils/interestTags.js) ─────────────────
  // Topic-filtered chronological feed, guest-safe, keyset-cursor paginated.
  // Posts only (articles + anonymous excluded by design). Legacy posts
  // without tags never surface. Rides the {interestTags, createdAt, _id} index.
  async hubFeed(tag, { cursor, limit }, viewerId) {
    if (!isInterestTag(tag)) throw new AppError("Unknown topic", 400, "UNKNOWN_TAG");
    const lim = Math.max(1, Math.min(50, Number(limit)));
    let bound = null;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed?.kind === "keyset") bound = parsed;
    }
    const filter = { kind: "post", ...NOT_ANON, interestTags: tag };
    if (bound) {
      filter.$or = [
        { createdAt: { $lt: new Date(bound.createdAtMs) } },
        { createdAt: new Date(bound.createdAtMs), _id: { $lt: bound.lastId } },
      ];
    }
    // limit+1 probe — one query per page instead of a countDocuments scan
    const rows = await Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(lim + 1)
      .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate")
      .lean();
    const hasMore = rows.length > lim;
    if (hasMore) rows.pop();
    // The cursor anchors on the RAW last consumed row even if this viewer
    // can't see it (strip happens after) — hidden posts can't punch gaps.
    const visible = await stripViewerHiddenPosts(rows, viewerId);
    await hydrateFeedPosts(visible, viewerId);
    const anchor = rows[rows.length - 1] || null;
    return {
      posts: visible,
      limit: lim,
      hasMore,
      nextCursor:
        hasMore && anchor
          ? encodeKeysetCursor({
              createdAtMs: new Date(anchor.createdAt).getTime(),
              lastId: String(anchor._id),
            })
          : null,
    };
  },

  // Explicit idempotent like: POST always ensures liked. Safe under burst:
  // unique index makes the insert the arbiter; only the winner $incs.
  async likePost(userId, postId) {
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    if (!post.isAnonymous) await assertCanSeePost(userId, post.author);
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
      if (!post.isAnonymous && String(post.author) !== String(userId)) {
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
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    if (!post.isAnonymous) await assertCanSeePost(userId, post.author);
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
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Reposts aren't allowed for anonymous posts", 403, "ANON_ACTION_NOT_ALLOWED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    await assertCanSeePost(userId, post.author);
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
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Reposts aren't allowed for anonymous posts", 403, "ANON_ACTION_NOT_ALLOWED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    await assertCanSeePost(userId, post.author);
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
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Bookmarks aren't allowed for anonymous posts", 403, "ANON_ACTION_NOT_ALLOWED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    await assertCanSeePost(userId, post.author);
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
    const post = await Post.findById(postId).select("author isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Bookmarks aren't allowed for anonymous posts", 403, "ANON_ACTION_NOT_ALLOWED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    await assertCanSeePost(userId, post.author);
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

  // Deduped impression: one increment per viewer per UTC day. Race-safe —
  // the unique (post, viewer, dayKey) insert is the arbiter; only the winner
  // $incs, exactly like likePost. Self-views never count (author checking
  // their own post must not inflate feedback). Blocked / private-hidden
  // posts behave like interactions: assertNoBlock + assertCanSeePost.
  // Returns { viewed, viewCount } — viewed=false means deduped (already
  // counted today) or self-view.
  async recordView(viewerId, postId) {
    const post = await Post.findById(postId).select("author viewCount isAnonymous");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(viewerId, post.author, "You can't interact with this account's posts.");
    if (!post.isAnonymous) await assertCanSeePost(viewerId, post.author);
    // Author's own views don't count — feedback must reflect real reach.
    if (String(post.author) === String(viewerId)) {
      const fresh = await Post.findById(postId).select("viewCount").lean();
      return { viewed: false, viewCount: fresh?.viewCount || 0 };
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    let inserted = false;
    try {
      const { PostView } = await import("../models/PostView.js");
      await PostView.create({ post: postId, viewer: viewerId, dayKey });
      inserted = true;
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    let updated;
    if (inserted) {
      updated = await Post.findByIdAndUpdate(postId, { $inc: { viewCount: 1 } }, { new: true }).select("viewCount author");
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), viewCount: updated.viewCount }),
      );
    } else {
      updated = await Post.findById(postId).select("viewCount").lean();
    }
    invalidatePostCounts(postId);
    return { viewed: inserted, viewCount: updated.viewCount || 0 };
  },

  // single-choice poll vote, changeable until expiry. No feed invalidation —
  // feed caches are 30s and vote counts ride along; only the single-post
  // cache is dropped so detail stays fresh without cache stampedes.
  async vote(userId, postId, optionIndex) {
    const idx = Number(optionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new AppError("Invalid option", 400, "INVALID_POLL_VOTE");
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (post.isAnonymous) throw new AppError("Polls aren't allowed for anonymous posts", 403, "ANON_ACTION_NOT_ALLOWED");
    if (!post.poll?.options?.length) throw new AppError("Post has no poll", 400, "NO_POLL");
    if (idx >= post.poll.options.length) throw new AppError("Invalid option", 400, "INVALID_POLL_VOTE");
    if (pollClosed(post.poll)) throw new AppError("Poll is closed", 400, "POLL_CLOSED");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    await assertCanSeePost(userId, post.author);

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
    const posts = await Post.find({ _id: { $in: postIds }, ...NOT_ANON })
      .populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
      .lean();
    const map = new Map(posts.map((p) => [String(p._id), p]));
    let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
    ordered = ordered.filter((p) => !p.isAnonymous);
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
    const post = await Post.findById(postId).select("author isAnonymous anonAlias");
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const t = (text || "").trim();
    if (!t || t.length > 500) throw new AppError("Reply must be 1-500 characters", 400, "INVALID_TEXT");
    if (post.isAnonymous) {
      // All-anonymous threads: no mentions, no reply-policy gates, no notifications
      // (notifications would leak identity via actor).
      if (extractMentions(t).length) throw new AppError("@mentions aren't allowed in anonymous posts", 400, "ANON_NO_MENTIONS");
      const comment = await Comment.create({ post: postId, author: userId, text: t, mentions: [], articleMentions: [] });
      const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { replyCount: 1 } }, { new: true }).select("replyCount author");
      afterResponse(() =>
        pushPostUpdate(post.author, { postId: String(postId), replyCount: updatedPost.replyCount }),
      );
      cache.del(CacheKeys.post(postId));
      cache.delPattern(`comments:${postId}:*`);
      cache.delPattern("anonFeed:*");
      const populated = await Comment.findById(comment._id).populate("author", "fullName username avatarUrl").lean();
      const masked = maskAnonComment(populated, post, userId);
      return { comment: masked, replyCount: updatedPost.replyCount };
    }
    await assertCanSeePost(userId, post.author);
    // Global reply policy on the post author's settings.
    {
      const { privacyService } = await import("./privacyService.js");
      const author = await User.findById(post.author).select("_id replyPolicy").lean();
      const gate = await privacyService.replyGate(userId, author || { _id: post.author });
      if (gate) throw new AppError(gate.message, gate.status, gate.code);
    }
    const mentions = extractMentions(t);
    await assertMentionsAllowed(userId, mentions);
    const comment = await Comment.create({ post: postId, author: userId, text: t, mentions, articleMentions: extractArticleMentions(t).map((r) => r.key) });
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
    const populated = await Comment.findById(comment._id).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder");
    return { comment: populated, replyCount: updatedPost.replyCount };
  },

  async getComments(postId, { page = 1, limit = 20 }, viewerId = null) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (viewerId && (await blockService.isBlocked(viewerId, post.author))) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    if (!post.isAnonymous) await assertCanSeePost(viewerId, post.author);
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.comments(postId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) {
      if (post.isAnonymous) {
        return { ...cached, comments: maskAnonComments(cached.comments, post, viewerId) };
      }
      return cached;
    }
    const [comments, total] = await Promise.all([
      Comment.find({ post: postId }).sort({ createdAt: 1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder").lean(),
      Comment.countDocuments({ post: postId }),
    ]);
    const out = post.isAnonymous ? maskAnonComments(comments, post, viewerId) : comments;
    // cache raw (unmasked) so per-viewer isOwn stays correct; mask on read
    const result = { comments: post.isAnonymous ? comments : out, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    cache.set(cacheKey, result, TTL.COMMENTS);
    if (post.isAnonymous) return { ...result, comments: maskAnonComments(comments, post, viewerId) };
    return result;
  },

  // single endpoint for profile tabs — author / likedBy / repostedBy
  // Anonymous hub posts are always excluded here — hub-only by design.
  async list({ author, likedBy, repostedBy, kind, page = 1, limit = 20, viewerId }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    let filter = { ...NOT_ANON };
    if (kind === "article" || kind === "post") filter.kind = kind;
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
      filter = { _id: { $in: postIds }, ...NOT_ANON };
      // preserve like order
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      ordered = ordered.filter((p) => !p.isAnonymous);
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
      filter = { _id: { $in: postIds }, ...NOT_ANON };
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      ordered = ordered.filter((p) => !p.isAnonymous);
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
      // Strict private: only owner + followers can list posts.
      if (viewerId && String(viewerId) !== String(author)) {
        const target = await User.findById(author).select("_id isPrivate isDeactivated").lean();
        if (target?.isDeactivated) throw new AppError("Posts unavailable", 403, "PRIVATE_ACCOUNT");
        if (target?.isPrivate) {
          const ok = await Follow.exists({ follower: viewerId, following: author });
          if (!ok) throw new AppError("This account is private. Follow to see their posts.", 403, "PRIVATE_ACCOUNT");
        }
      } else if (!viewerId) {
        const target = await User.findById(author).select("_id isPrivate isDeactivated").lean();
        if (target?.isPrivate || target?.isDeactivated) throw new AppError("Posts unavailable", 403, "PRIVATE_ACCOUNT");
      }
    }

    const cacheKey = author && !filter.kind ? CacheKeys.userPosts(author, page, lim) : author && filter.kind === "article" ? CacheKeys.userArticles(author, page, lim) : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter).sort(sort).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder").lean(),
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
  async mediaByAuthor(authorId, { page = 1, limit = 20 }, viewerId = null) {
    // Strict private gate mirrors list().
    if (viewerId && String(viewerId) !== String(authorId)) {
      const target = await User.findById(authorId).select("_id isPrivate isDeactivated").lean();
      if (target?.isDeactivated) throw new AppError("Posts unavailable", 403, "PRIVATE_ACCOUNT");
      if (target?.isPrivate) {
        const ok = await Follow.exists({ follower: viewerId, following: authorId });
        if (!ok) throw new AppError("This account is private.", 403, "PRIVATE_ACCOUNT");
      }
    } else if (!viewerId) {
      const target = await User.findById(authorId).select("_id isPrivate isDeactivated").lean();
      if (target?.isPrivate || target?.isDeactivated) throw new AppError("Posts unavailable", 403, "PRIVATE_ACCOUNT");
    }
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const cacheKey = CacheKeys.mediaByAuthor(authorId, page, lim);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const filter = {
      author: authorId,
      ...NOT_ANON,
      $or: [{ imageUrl: { $ne: null } }, { "media.0": { $exists: true } }],
    };
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .select("_id imageUrl media isSensitive text createdAt likeCount replyCount repostCount")
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
      Comment.find({ author: authorId }).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("post", "text author createdAt isAnonymous").populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder").lean(),
      Comment.countDocuments({ author: authorId }),
    ]);
    // Anonymous hub replies never surface on profiles — hub-only.
    const visible = comments.filter((c) => !c.post?.isAnonymous);
    // also populate post author for context — single $in query, no N+1
    const postAuthorIds = [...new Set(visible.map((c) => String(c.post?.author)).filter(Boolean))];
    if (postAuthorIds.length) {
      const authors = await User.find({ _id: { $in: postAuthorIds } })
        .select("fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder")
        .lean();
      const authorMap = new Map(authors.map((a) => [String(a._id), a]));
      for (const c of visible) {
        if (c.post?.author && authorMap.has(String(c.post.author))) {
          c.post.author = authorMap.get(String(c.post.author));
        }
      }
    }
    const result = { comments: visible, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
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
    const hiddenSet = await hiddenAuthorFilter(viewerId);
    const filter = { hashtags: tag, ...NOT_ANON };
    if (hiddenSet.size) filter.author = { $nin: [...hiddenSet] };
    const [rawPosts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder isPrivate").lean(),
      Post.countDocuments(filter),
    ]);
    let posts = await withoutBlockedAuthors(rawPosts, viewerId);
    posts = posts.filter((p) => !p.author?.isPrivate || String(p.author?._id) === String(viewerId || ""));
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
      { $match: { createdAt: { $gte: since }, hashtags: { $ne: [] }, isAnonymous: { $ne: true } } },
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
