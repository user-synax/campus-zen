"use client";

/**
 * Central optimistic cache helpers — single source of truth for patching
 * post/user counts across feed, detail, bookmarks, profile tabs.
 * SSE `post:update` / `follow:update` and local mutations both funnel here,
 * so counts never diverge between surfaces.
 */

function patchPostObject(p, postId, patch) {
  if (!p) return p;
  if (String(p._id) !== String(postId)) return p;
  return { ...p, ...patch };
}

function patchPages(pages, postId, patch) {
  if (!pages) return pages;
  return pages.map((page) => {
    const posts = page?.data?.posts || page?.posts;
    if (!posts) return page;
    let changed = false;
    const next = posts.map((p) => {
      if (String(p._id) !== String(postId)) return p;
      changed = true;
      return { ...p, ...patch };
    });
    if (!changed) return page;
    if (page?.data?.posts) return { ...page, data: { ...page.data, posts: next } };
    return { ...page, posts: next };
  });
}

export function patchPostEverywhere(qc, postId, patch) {
  const id = String(postId);
  // infinite feeds: ["feed", tab], ["publicFeed"], ["bookmarks"], ["notifications"...] skip
  for (const key of qc.getQueryCache().findAll().map((q) => q.queryKey)) {
    const [ns] = key;
    if (ns === "feed" || ns === "publicFeed" || ns === "bookmarks") {
      qc.setQueryData(key, (old) => {
        if (!old?.pages) return old;
        return { ...old, pages: patchPages(old.pages, id, patch) };
      });
    }
    if (ns === "post" && String(key[1]) === id) {
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        // API shape is { success, data: { post } }
        if (old?.data?.post) return { ...old, data: { ...old.data, post: { ...old.data.post, ...patch } } };
        return { ...old, ...patch };
      });
    }
    // profile tabs are plain (non-infinite) queries: userPosts/userLikes/userReposts/hashtagPosts/collegePosts
    if (["userPosts", "userLikes", "userReposts", "hashtagPosts", "collegePosts"].includes(ns)) {
      qc.setQueryData(key, (old) => {
        const posts = old?.data?.posts;
        if (!posts) return old;
        const next = posts.map((p) => patchPostObject(p, id, patch));
        return { ...old, data: { ...old.data, posts: next } };
      });
    }
    // replies detail: ["replies", postId, page] nests under .data, patch parent post count only via ["post",id]
  }
  // detail replies count lives on ["post", id] — handled above; also patch
  // any ["replies", ...] parent? No-op — replyCount is on post, not replies.
}

export function patchUserEverywhere(qc, userId, patch) {
  const id = String(userId);
  for (const q of qc.getQueryCache().findAll()) {
    const key = q.queryKey;
    const [ns] = key;
    if (ns === "user") {
      qc.setQueryData(key, (old) => {
        const u = old?.data?.user || old?.user;
        if (!u || String(u._id) !== id) return old;
        if (old?.data?.user) return { ...old, data: { ...old.data, user: { ...u, ...patch } } };
        return { ...old, ...patch };
      });
    }
    if (ns === "me") {
      qc.setQueryData(key, (old) => {
        const u = old?.data?.user || old?.user || old?.data;
        if (!u || String(u._id) !== id) return old;
        if (old?.data?.user) return { ...old, data: { ...old.data, user: { ...u, ...patch } } };
        return old;
      });
    }
    // suggestion / follower lists carry embedded user objects
    if (["suggestions", "followers", "following", "search"].includes(ns)) {
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        const patchList = (list) =>
          Array.isArray(list) ? list.map((u) => (String(u?._id) === id ? { ...u, ...patch } : u)) : list;
        if (old?.data?.users) return { ...old, data: { ...old.data, users: patchList(old.data.users) } };
        if (old?.data?.suggestions) return { ...old, data: { ...old.data, suggestions: patchList(old.data.suggestions) } };
        if (Array.isArray(old?.data)) return { ...old, data: patchList(old.data) };
        return old;
      });
    }
  }
}
