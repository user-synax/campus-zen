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
    mutationFn: (postId) => api.likePost(postId),
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ["feed"] });
      await qc.cancelQueries({ queryKey: ["publicFeed"] });
      await qc.cancelQueries({ queryKey: ["post", postId] });

      // Snapshot previous values
      const previousPost = qc.getQueryData(["post", postId]);

      // Optimistically update post detail
      if (previousPost) {
        qc.setQueryData(["post", postId], (old) => ({
          ...old,
          isLiked: !old.isLiked,
          likeCount: old.likeCount + (old.isLiked ? -1 : 1),
        }));
      }

      return { previousPost };
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousPost) {
        qc.setQueryData(["post", postId], context.previousPost);
      }
    },
    onSettled: (data, error, postId) => {
      // Refetch to ensure consistency
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["publicFeed"] });
    },
  });
}

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => api.repostPost(postId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["publicFeed"] });
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => api.bookmarkPost(postId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.followUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.unfollowUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useCreateReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }) => api.createReply(postId, text),
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["replies", postId] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
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
