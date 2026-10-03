"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { api } from "../api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  me: ["me"],
  feed: (tab) => ["feed", tab],
  publicFeed: () => ["publicFeed"],
  post: (id) => ["post", id],
  user: (username) => ["user", username],
  userPosts: (username, page) => ["userPosts", username, page],
  userReplies: (username, page) => ["userReplies", username, page],
  userLikes: (username, page) => ["userLikes", username, page],
  userReposts: (username, page) => ["userReposts", username, page],
  userMedia: (username, page) => ["userMedia", username, page],
  notifications: (filter, type) => ["notifications", filter, type],
  unreadCount: ["unreadCount"],
  trendingHashtags: ["trendingHashtags"],
  hashtagPosts: (tag, page) => ["hashtagPosts", tag, page],
  bookmarks: (page) => ["bookmarks", page],
  search: (q, type) => ["search", q, type],
  suggestions: ["suggestions"],
  followers: (id, page) => ["followers", id, page],
  following: (id, page) => ["following", id, page],
  college: (slug) => ["college", slug],
  collegeMembers: (slug, page) => ["collegeMembers", slug, page],
  collegePosts: (slug, page) => ["collegePosts", slug, page],
  replies: (postId, page) => ["replies", postId, page],
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me(),
    staleTime: 60_000, // Current user data is fairly stable
    // "Signed out" is an answer, not a transient failure — retrying it only
    // delays the redirect to /login, and the default exponential backoff can
    // leave the auth gate waiting several seconds on a flaky connection.
    retry: (failureCount, error) =>
      error?.status === 401 ? false : failureCount < 2,
    retryDelay: 1_000,
  });
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export function useFeed(tab = "following") {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(tab),
    queryFn: ({ pageParam = 1 }) =>
      tab === "following"
        ? api.getFeed({ page: pageParam })
        : api.getPublicFeed({ page: pageParam }),
    // pages are raw API bodies { success, data: { posts, page, hasMore } } —
    // read through .data (same as useReplies/useBookmarks). Reading
    // lastPage.hasMore directly is always undefined, which silently capped
    // the feed at page 1 with no Load more button.
    getNextPageParam: (lastPage) =>
      lastPage.data?.hasMore ? (lastPage.data?.page || 1) + 1 : undefined,
    initialPageParam: 1,
    staleTime: 15_000,
    // Tab switches stay instant: keep the last feed on screen while the
    // fresh page loads in the background.
    placeholderData: (prev) => prev,
  });
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export function usePost(postId) {
  return useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => api.getPost(postId),
    staleTime: 30_000,
    enabled: !!postId,
  });
}

/**
 * Replies for a post, paged.
 *
 * Infinite so the detail page can append "Show more replies" without
 * refetching what the reader has already scrolled past.
 */
export function useReplies(postId) {
  return useInfiniteQuery({
    queryKey: queryKeys.replies(postId, 1),
    queryFn: ({ pageParam }) => api.getReplies(postId, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.data?.hasMore ? (last.data?.page || 1) + 1 : undefined,
    staleTime: 15_000,
    enabled: !!postId,
  });
}

// ─── User / Profile ──────────────────────────────────────────────────────────

export function useUser(username) {
  return useQuery({
    queryKey: queryKeys.user(username),
    queryFn: () => api.getUser(username),
    staleTime: 30_000,
    enabled: !!username,
  });
}

export function useUserPosts(username, page = 1) {
  return useQuery({
    queryKey: queryKeys.userPosts(username, page),
    queryFn: () => api.getUserPosts(username, { page }),
    staleTime: 15_000,
    enabled: !!username,
  });
}

export function useUserReplies(username, page = 1) {
  return useQuery({
    queryKey: queryKeys.userReplies(username, page),
    queryFn: () => api.getUserReplies(username, { page }),
    staleTime: 15_000,
    enabled: !!username,
  });
}

export function useUserLikes(username, page = 1) {
  return useQuery({
    queryKey: queryKeys.userLikes(username, page),
    queryFn: () => api.getUserLikes(username, { page }),
    staleTime: 15_000,
    enabled: !!username,
  });
}

export function useUserReposts(username, page = 1) {
  return useQuery({
    queryKey: queryKeys.userReposts(username, page),
    queryFn: () => api.getUserReposts(username, { page }),
    staleTime: 15_000,
    enabled: !!username,
  });
}

export function useUserMedia(username, page = 1) {
  return useQuery({
    queryKey: queryKeys.userMedia(username, page),
    queryFn: () => api.getUserMedia(username, { page }),
    staleTime: 30_000,
    enabled: !!username,
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function useNotifications(filter = "all", type = "all") {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(filter, type),
    queryFn: ({ pageParam = 1 }) =>
      api.getNotifications({ page: pageParam, filter, type }),
    // same .data unwrap as useFeed — raw bodies nest paging under data
    getNextPageParam: (lastPage) =>
      lastPage.data?.hasMore ? (lastPage.data?.page || 1) + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.getUnreadCount(),
    staleTime: 15_000,
    // The badge must never block the tab bar: render 0 instantly and patch
    // it when the network (or SSE) answers.
    placeholderData: (prev) => prev ?? { data: { count: 0 } },
    refetchOnMount: false,
  });
}

export function useBlocks(enabled = true) {
  return useQuery({
    queryKey: ["blocks"],
    queryFn: () => api.getBlocks(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useIncomingRequests(enabled = true) {
  return useQuery({
    queryKey: ["follow-requests", "incoming"],
    queryFn: () => api.getIncomingRequests(),
    staleTime: 30_000,
    enabled,
  });
}

export function useOutgoingRequests(enabled = true) {
  return useQuery({
    queryKey: ["follow-requests", "outgoing"],
    queryFn: () => api.getOutgoingRequests(),
    staleTime: 30_000,
    enabled,
  });
}

export function useMyReports(enabled = true) {
  return useQuery({
    queryKey: ["my-reports"],
    queryFn: () => api.getMyReports(),
    staleTime: 30_000,
    enabled,
  });
}

export function useMyAppeals(enabled = true) {
  return useQuery({
    queryKey: ["my-appeals"],
    queryFn: () => api.getMyAppeals(),
    staleTime: 30_000,
    enabled,
  });
}

// ─── Hashtags ────────────────────────────────────────────────────────────────

export function useTrendingHashtags() {
  return useQuery({
    queryKey: queryKeys.trendingHashtags,
    queryFn: () => api.getTrendingHashtags(),
    staleTime: 60_000,
  });
}

export function useHashtagPosts(tag, page = 1) {
  return useQuery({
    queryKey: queryKeys.hashtagPosts(tag, page),
    queryFn: () => api.getPostsByHashtag(tag, { page }),
    staleTime: 15_000,
    enabled: !!tag,
  });
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export function useBookmarks() {
  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: ({ pageParam = 1 }) => api.getBookmarks({ page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.data?.hasMore ? (lastPage.data?.page || 1) + 1 : undefined,
    initialPageParam: 1,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

export function useSearch(q, type = "all") {
  return useQuery({
    queryKey: queryKeys.search(q, type),
    queryFn: () => api.search({ q, type }),
    staleTime: 30_000,
    enabled: !!q && q.length >= 2,
    // Typing a new letter keeps old results on screen instead of flashing a
    // skeleton — the tab feels instant even on slow networks.
    placeholderData: (prev) => prev,
  });
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export function useSuggestions() {
  return useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: () => api.getSuggestions(),
    staleTime: 60_000,
  });
}

// ─── Followers / Following ───────────────────────────────────────────────────

export function useFollowers(userId, page = 1) {
  return useQuery({
    queryKey: queryKeys.followers(userId, page),
    queryFn: () => api.getFollowers(userId, { page }),
    staleTime: 30_000,
    enabled: !!userId,
  });
}

export function useFollowing(userId, page = 1) {
  return useQuery({
    queryKey: queryKeys.following(userId, page),
    queryFn: () => api.getFollowing(userId, { page }),
    staleTime: 30_000,
    enabled: !!userId,
  });
}

// ─── Colleges ────────────────────────────────────────────────────────────────

export function useCollege(slug) {
  return useQuery({
    queryKey: queryKeys.college(slug),
    queryFn: () => api.getCollege(slug),
    staleTime: 60_000,
    enabled: !!slug,
  });
}

export function useCollegeMembers(slug, page = 1) {
  return useQuery({
    queryKey: queryKeys.collegeMembers(slug, page),
    queryFn: () => api.getCollegeMembers(slug, { page }),
    staleTime: 30_000,
    enabled: !!slug,
  });
}

export function useCollegePosts(slug, page = 1) {
  return useQuery({
    queryKey: queryKeys.collegePosts(slug, page),
    queryFn: () => api.getCollegePosts(slug, { page }),
    staleTime: 15_000,
    enabled: !!slug,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text, image, media, poll, extra }) =>
      api.createPost(text, media ?? image, poll, extra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["publicFeed"] });
      qc.invalidateQueries({ queryKey: ["trendingHashtags"] });
    },
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    // Accepts postId string (toggles based on cache) or { postId, liked: true|false } explicit.
    mutationFn: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      const explicitLiked = typeof arg === "object" ? arg.liked : undefined;
      let currentlyLiked = explicitLiked;
      if (currentlyLiked === undefined) {
        const cached = qc.getQueryData(["post", postId]);
        const p = cached?.data?.post || cached;
        currentlyLiked = Boolean(p?.isLiked);
      }
      const res = currentlyLiked
        ? await api.unlikePost(postId)
        : await api.likePost(postId);
      return { postId, ...res.data };
    },
    onMutate: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      await qc.cancelQueries({ queryKey: ["feed"] });
      await qc.cancelQueries({ queryKey: ["publicFeed"] });
      await qc.cancelQueries({ queryKey: ["post", postId] });
      // Snapshot for rollback: capture current liked/count from detail cache
      const previousPost = qc.getQueryData(["post", postId]);
      const p = previousPost?.data?.post || previousPost;
      const wasLiked = Boolean(p?.isLiked);
      const wasCount = Number(p?.likeCount ?? 0);
      const { patchPostEverywhere } = await import("../optimistic.js");
      patchPostEverywhere(qc, postId, {
        isLiked: !wasLiked,
        likeCount: wasLiked ? Math.max(0, wasCount - 1) : wasCount + 1,
      });
      return { previousPost, postId, wasLiked, wasCount };
    },
    onError: (_err, _arg, context) => {
      if (!context) return;
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, context.postId, {
          isLiked: context.wasLiked,
          likeCount: context.wasCount,
        });
      });
    },
    onSuccess: (data) => {
      // Reconcile with authoritative server count — no full feed refetch.
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, data.postId, {
          isLiked: data.liked,
          likeCount: data.likeCount,
        });
      });
    },
  });
}

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      const explicit = typeof arg === "object" ? arg.reposted : undefined;
      let currently = explicit;
      if (currently === undefined) {
        const cached = qc.getQueryData(["post", postId]);
        const p = cached?.data?.post || cached;
        currently = Boolean(p?.isReposted);
      }
      const res = currently ? await api.unrepostPost(postId) : await api.repostPost(postId);
      return { postId, ...res.data };
    },
    onMutate: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      await qc.cancelQueries({ queryKey: ["feed"] });
      await qc.cancelQueries({ queryKey: ["publicFeed"] });
      const cached = qc.getQueryData(["post", postId]);
      const p = cached?.data?.post || cached;
      const was = Boolean(p?.isReposted);
      const wasCount = Number(p?.repostCount ?? 0);
      const { patchPostEverywhere } = await import("../optimistic.js");
      patchPostEverywhere(qc, postId, {
        isReposted: !was,
        repostCount: was ? Math.max(0, wasCount - 1) : wasCount + 1,
      });
      return { postId, was, wasCount };
    },
    onError: (_e, _a, ctx) => {
      if (!ctx) return;
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, ctx.postId, { isReposted: ctx.was, repostCount: ctx.wasCount });
      });
    },
    onSuccess: (data) => {
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, data.postId, { isReposted: data.reposted, repostCount: data.repostCount });
      });
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      const explicit = typeof arg === "object" ? arg.bookmarked : undefined;
      let currently = explicit;
      if (currently === undefined) {
        const cached = qc.getQueryData(["post", postId]);
        const p = cached?.data?.post || cached;
        currently = Boolean(p?.isBookmarked);
      }
      const res = currently ? await api.unbookmarkPost(postId) : await api.bookmarkPost(postId);
      return { postId, ...res.data };
    },
    onMutate: async (arg) => {
      const postId = typeof arg === "string" ? arg : arg.postId;
      const cached = qc.getQueryData(["post", postId]);
      const p = cached?.data?.post || cached;
      const was = Boolean(p?.isBookmarked);
      const { patchPostEverywhere } = await import("../optimistic.js");
      patchPostEverywhere(qc, postId, { isBookmarked: !was });
      return { postId, was };
    },
    onError: (_e, _a, ctx) => {
      if (!ctx) return;
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, ctx.postId, { isBookmarked: ctx.was });
      });
    },
    onSuccess: (data) => {
      import("../optimistic.js").then(({ patchPostEverywhere }) => {
        patchPostEverywhere(qc, data.postId, { isBookmarked: data.bookmarked });
      });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.followUser(userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["user"] });
      const { patchUserEverywhere } = await import("../optimistic.js");
      patchUserEverywhere(qc, userId, { isFollowing: true });
      return { userId };
    },
    onSuccess: (res, userId) => {
      import("../optimistic.js").then(({ patchUserEverywhere }) => {
        if (res?.data?.requested) {
          patchUserEverywhere(qc, userId, { isFollowing: false, isFollowRequested: true });
        } else {
          const counts = res?.data?.followingCounts;
          patchUserEverywhere(qc, userId, {
            isFollowing: true,
            isFollowRequested: false,
            ...(counts?.followersCount != null ? { followersCount: counts.followersCount } : {}),
          });
        }
      });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["follow-requests"] });
    },
    onError: (_e, userId) => {
      import("../optimistic.js").then(({ patchUserEverywhere }) => {
        patchUserEverywhere(qc, userId, { isFollowing: false, isFollowRequested: false });
      });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.unfollowUser(userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["user"] });
      const { patchUserEverywhere } = await import("../optimistic.js");
      patchUserEverywhere(qc, userId, { isFollowing: false });
      return { userId };
    },
    onSuccess: (res, userId) => {
      import("../optimistic.js").then(({ patchUserEverywhere }) => {
        const counts = res?.data?.followingCounts;
        patchUserEverywhere(qc, userId, {
          isFollowing: false,
          ...(counts?.followersCount != null ? { followersCount: counts.followersCount } : {}),
        });
      });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: (_e, userId) => {
      import("../optimistic.js").then(({ patchUserEverywhere }) => {
        patchUserEverywhere(qc, userId, { isFollowing: true });
      });
    },
  });
}

export function useCreateReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }) => api.createReply(postId, text),
    onSuccess: (res, { postId }) => {
      // Prepend to replies cache + bump post replyCount without full refetch.
      const comment = res?.data?.comment;
      const replyCount = res?.data?.replyCount;
      if (comment) {
        qc.setQueryData(["replies", postId, 1], (old) => {
          if (!old?.pages) return old;
          const pages = [...old.pages];
          const first = pages[0];
          if (first?.data?.comments) {
            pages[0] = { ...first, data: { ...first.data, comments: [comment, ...first.data.comments] } };
          }
          return { ...old, pages };
        });
      }
      if (replyCount != null) {
        import("../optimistic.js").then(({ patchPostEverywhere }) => {
          patchPostEverywhere(qc, postId, { replyCount });
        });
      }
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }) => api.updatePost(postId, text),
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => api.deletePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["publicFeed"] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.markNotificationRead(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.updateMe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => api.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUploadCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => api.uploadCover(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function usePinPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => api.pinPost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
