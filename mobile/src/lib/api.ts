import { tokens } from "./tokens";

export const BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

export interface ApiErrorDetail {
  path?: string[];
  message?: string;
}

export interface ApiErrorData {
  success?: boolean;
  message?: string;
  code?: string;
  details?: ApiErrorDetail[];
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;
  offline: boolean;
  constructor(status: number, data: ApiErrorData, offline = false) {
    super(data.message || (offline ? "Network request failed" : `Request failed (${status})`));
    this.status = status;
    this.data = data;
    this.offline = offline;
  }
}

// Same auth endpoints as web (lib/api.js): a 401 here means bad
// credentials, not an expired session — never auto-refresh on these.
const NO_AUTO_RETRY = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/resend-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/check-username",
]);

// Single-flight refresh: concurrent 401s share one rotation.
let refreshPromise: Promise<void> | null = null;
function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refresh }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(res.status, data);
        const next = data?.data ?? {};
        await tokens.save(next.accessToken ?? null, next.refreshToken ?? tokens.refresh);
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

interface RequestOpts {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, opts: RequestOpts = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, { message: e instanceof Error ? e.message : "Network request failed" }, true);
  }

  if (res.status === 401 && !retried && !NO_AUTO_RETRY.has(path.split("?")[0]) && tokens.refresh) {
    try {
      await refreshSession();
      return request<T>(path, opts, true);
    } catch {
      // refresh failed — fall through and throw the original 401
    }
  }

  const data = (await res.json().catch(() => ({}))) as ApiErrorData;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data: { user: AuthUser; accessToken?: string; refreshToken?: string };
}

export interface FeedAuthor {
  _id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  email?: string;
  isOwner?: boolean;
  isFounder?: boolean;
  isCofounder?: boolean;
  isPro?: boolean;
  isVerified?: boolean;
}

export interface PostMediaItem {
  url: string;
  kind: "image" | "gif" | "video";
  posterUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PostPoll {
  options: { text: string; votes: number }[];
  totalVotes: number;
  expiresAt?: string;
  closed?: boolean;
}

export interface FeedPost {
  _id: string;
  kind?: "post" | "article";
  text?: string;
  title?: string;
  slug?: string;
  description?: string;
  createdAt: string;
  edited?: boolean;
  author: FeedAuthor;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  viewCount?: number | null;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  imageUrl?: string;
  media?: PostMediaItem[];
  poll?: PostPoll;
  myVote?: number | null;
}

interface FeedResponse {
  success: boolean;
  data: { posts: FeedPost[]; page: number; limit: number; hasMore: boolean };
}

export interface PostComment {
  _id: string;
  post: string;
  author: FeedAuthor;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  base: BASE,
  checkUsername: (username: string) =>
    request<{ success: boolean; data: { available: boolean; reason: string } }>(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`,
    ),
  signup: (payload: { fullName: string; username: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: payload }),
  login: (payload: { username: string; password: string; remember?: boolean }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: payload }),
  me: () => request<{ success: boolean; data: { user: AuthUser } }>("/api/auth/me"),
  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken: tokens.refresh },
    }),
  getFeed: (params: { page?: number; limit?: number } = {}) =>
    request<FeedResponse>(
      `/api/posts/feed?page=${params.page ?? 1}&limit=${params.limit ?? 20}`,
    ),
  getPublicFeed: (params: { page?: number; limit?: number } = {}) =>
    request<FeedResponse>(
      `/api/posts/public?page=${params.page ?? 1}&limit=${params.limit ?? 20}`,
    ),
  likePost: (id: string) =>
    request<{ success: boolean; data: { liked: boolean; likeCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/like`,
      { method: "POST" },
    ),
  unlikePost: (id: string) =>
    request<{ success: boolean; data: { liked: boolean; likeCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/like`,
      { method: "DELETE" },
    ),
  repostPost: (id: string) =>
    request<{ success: boolean; data: { reposted: boolean; repostCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/repost`,
      { method: "POST" },
    ),
  unrepostPost: (id: string) =>
    request<{ success: boolean; data: { reposted: boolean; repostCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/repost`,
      { method: "DELETE" },
    ),
  bookmarkPost: (id: string) =>
    request<{ success: boolean; data: { bookmarked: boolean } }>(
      `/api/posts/${encodeURIComponent(id)}/bookmark`,
      { method: "POST" },
    ),
  unbookmarkPost: (id: string) =>
    request<{ success: boolean; data: { bookmarked: boolean } }>(
      `/api/posts/${encodeURIComponent(id)}/bookmark`,
      { method: "DELETE" },
    ),
  votePoll: (id: string, optionIndex: number) =>
    request<{ success: boolean; data: { poll: PostPoll; myVote: number } }>(
      `/api/posts/${encodeURIComponent(id)}/vote`,
      { method: "POST", body: { optionIndex } },
    ),
  recordPostView: (id: string) =>
    request<{ success: boolean; data: { viewed: boolean; viewCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/view`,
      { method: "POST" },
    ),
  getPost: (id: string) =>
    request<{ success: boolean; data: { post: FeedPost } }>(
      `/api/posts/${encodeURIComponent(id)}`,
    ),
  getReplies: (id: string, params: { page?: number; limit?: number } = {}) =>
    request<{
      success: boolean;
      data: {
        comments: PostComment[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      };
    }>(`/api/posts/${encodeURIComponent(id)}/replies?page=${params.page ?? 1}&limit=${params.limit ?? 20}`),
  createReply: (id: string, text: string) =>
    request<{ success: boolean; data: { comment: PostComment; replyCount: number } }>(
      `/api/posts/${encodeURIComponent(id)}/replies`,
      { method: "POST", body: { text } },
    ),
};
