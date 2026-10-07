/**
 * Simple in-memory cache with TTL and pattern-based invalidation.
 * Designed for single-instance deployments (Render free tier).
 * For multi-instance, replace with Redis (Upstash free tier works).
 */
class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  /** Cancel a key's pending expiry timer, if any. */
  #clearTimer(key) {
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.delete(key);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      this.#clearTimer(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 60_000) {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
    this.#clearTimer(key);
    if (ttlMs > 0) {
      this.timers.set(
        key,
        setTimeout(() => {
          this.store.delete(key);
          this.timers.delete(key);
        }, ttlMs),
      );
    }
  }

  del(key) {
    this.store.delete(key);
    this.#clearTimer(key);
  }

  /** Invalidate all keys matching a glob pattern, e.g. delPattern('feed:*') */
  delPattern(pattern) {
    const regex = new RegExp("^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    for (const key of [...this.store.keys()]) {
      if (regex.test(key)) this.del(key);
    }
  }

  /** Get cache stats for monitoring */
  stats() {
    return { size: this.store.size, keys: [...this.store.keys()] };
  }

  /** Clear everything */
  clear() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.store.clear();
    this.timers.clear();
  }
}

// ─── Cache monitoring middleware ──────────────────────────────────────────────

/**
 * Exposes cache stats at /api/admin/cache-stats (protected, admin only).
 * Useful for monitoring hit rates and memory usage in production.
 */
export function cacheStatsHandler(req, res) {
  const stats = cache.stats();
  res.json({
    size: stats.size,
    keys: stats.keys.slice(0, 100), // Limit response size
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clears all caches at /api/admin/cache-clear (protected, admin only).
 * Useful for manual invalidation after deployments.
 */
export function cacheClearHandler(req, res) {
  cache.clear();
  res.json({ message: "Cache cleared", timestamp: new Date().toISOString() });
}

export const cache = new InMemoryCache();

// ─── Cache key helpers ────────────────────────────────────────────────────────

export const CacheKeys = {
  feed: (userId, page, limit) => `feed:${userId}:${page}:${limit}`,
  publicFeed: (page, limit) => `publicFeed:${page}:${limit}`,
  trending: (limit, hours) => `trending:${limit}:${hours}`,
  post: (postId) => `post:${postId}`,
  userPosts: (authorId, page, limit) => `userPosts:${authorId}:${page}:${limit}`,
  userLikes: (userId, page, limit) => `userLikes:${userId}:${page}:${limit}`,
  userReposts: (userId, page, limit) => `userReposts:${userId}:${page}:${limit}`,
  mediaByAuthor: (authorId, page, limit) => `media:${authorId}:${page}:${limit}`,
  hashtag: (tag, page, limit) => `hashtag:${tag}:${page}:${limit}`,
  userProfile: (username) => `user:${username}`,
  suggestions: (viewerId) => `suggestions:${viewerId}`,
  comments: (postId, page, limit) => `comments:${postId}:${page}:${limit}`,
  bookmarks: (userId, page, limit) => `bookmarks:${userId}:${page}:${limit}`,
  repliesByUser: (authorId, page, limit) => `replies:${authorId}:${page}:${limit}`,
  article: (username, slug) => `article:${username.toLowerCase()}:${slug.toLowerCase()}`,
  articleList: (page, limit) => `articles:${page}:${limit}`,
  userArticles: (authorId, page, limit) => `userArticles:${authorId}:${page}:${limit}`,
};

// ─── TTL constants (milliseconds) ─────────────────────────────────────────────

export const TTL = {
  FEED: 30_000, // 30s — feeds change frequently
  PUBLIC_FEED: 30_000,
  TRENDING: 300_000, // 5min — trending is expensive aggregation
  POST: 60_000, // 1min
  USER_POSTS: 30_000,
  MEDIA: 60_000,
  HASHTAG: 30_000,
  USER_PROFILE: 120_000, // 2min
  SUGGESTIONS: 60_000, // 1min
  COMMENTS: 30_000,
  BOOKMARKS: 30_000,
  REPLIES: 30_000,
};
