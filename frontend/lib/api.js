const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function toApiError(res, data) {
  const msg = data.message || `Request failed (${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  err.data = data;
  err.details = data.details;
  return err;
}

// Auth endpoints must never trigger a refresh — a 401 here means
// bad credentials / expired OTP, not an expired access token.
// NOTE: /api/auth/me is deliberately NOT in this set. The access cookie lives
// only 15m while the refresh cookie lives 7d/1d, so after ~15m idle the next
// /me returns 401 with a still-valid refresh token. Excluding /me from retry
// is what caused the "auto logout every 15 min" bug — the shell treats a /me
// 401 as signedOut and redirects to /login without ever trying rotation.
// Retrying /me once via refresh is loop-safe: the retry uses _retried=true and
// /refresh itself never retries.
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
  "/api/admin/login",
  "/api/admin/logout",
]);

function shouldAutoRetry(path) {
  const clean = path.split("?")[0];
  // Admin uses its own adminToken cookie — user refresh must never run for it.
  if (clean.startsWith("/api/admin")) return false;
  return !NO_AUTO_RETRY.has(clean);
}

// Single-flight session refresh: concurrent 401s share one rotation.
let refreshPromise = null;
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await request("/api/auth/refresh", {
          method: "POST",
          _skipRetry: true,
        });
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request(
  path,
  {
    method = "GET",
    body,
    form,
    credentials = "include",
    headers = {},
    _retried = false,
    _skipRetry = false,
  } = {},
) {
  const opts = {
    method,
    headers: { ...headers },
    credentials,
  };
  if (form !== undefined) {
    // multipart — browser sets Content-Type + boundary
    opts.body = form;
  } else {
    opts.headers["Content-Type"] = "application/json";
    if (body !== undefined) opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch (e) {
    // A network/CORS failure never gets a status, so it reads as a generic
    // error. Left untyped, callers cannot tell "server is down" from "no
    // session" and retry the wrong thing.
    const err = new Error(e?.message || "Network request failed");
    err.status = 0;
    err.offline = true;
    throw err;
  }
  if (res.status === 401 && !_retried && !_skipRetry && shouldAutoRetry(path)) {
    try {
      await refreshSession();
      return request(path, {
        method,
        body,
        form,
        credentials,
        headers,
        _retried: true,
      });
    } catch {
      // refresh failed — fall through and throw the original 401
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res, data);
  return data;
}

export const api = {
  base: BASE,
  checkUsername: (username) =>
    request(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`,
    ),
  signup: (payload) =>
    request("/api/auth/signup", { method: "POST", body: payload }),
  verifyEmail: (payload) =>
    request("/api/auth/verify-email", { method: "POST", body: payload }),
  resendOtp: (payload) =>
    request("/api/auth/resend-otp", { method: "POST", body: payload }),
  login: (payload) =>
    request("/api/auth/login", { method: "POST", body: payload }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me", { method: "GET" }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  forgotPassword: (payload) =>
    request("/api/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) =>
    request("/api/auth/reset-password", { method: "POST", body: payload }),
  getUser: (username) =>
    request(`/api/users/${encodeURIComponent(username)}`, { method: "GET" }),
  listUsers: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/users${q ? `?${q}` : ""}`, { method: "GET" });
  },
  updateMe: (payload) =>
    request("/api/users/me", { method: "PATCH", body: payload }),
  getUserPosts: (username, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(username)}/posts${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getUserReplies: (username, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(username)}/replies${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getUserLikes: (username, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(username)}/likes${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getUserReposts: (username, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(username)}/reposts${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getUserMedia: (username, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(username)}/media${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  search: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/search${q ? `?${q}` : ""}`, { method: "GET" });
  },
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/notifications${q ? `?${q}` : ""}`, { method: "GET" });
  },
  getUnreadCount: () =>
    request("/api/notifications/unread-count", { method: "GET" }),
  markNotificationRead: (id) =>
    request(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    }),
  markAllNotificationsRead: () =>
    request("/api/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id) =>
    request(`/api/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  clearReadNotifications: () =>
    request("/api/notifications/clear-read", { method: "DELETE" }),
  followUser: (id) =>
    request(`/api/users/${encodeURIComponent(id)}/follow`, { method: "POST" }),
  unfollowUser: (id) =>
    request(`/api/users/${encodeURIComponent(id)}/follow`, {
      method: "DELETE",
    }),
  blockUser: (id) =>
    request(`/api/users/${encodeURIComponent(id)}/block`, { method: "POST" }),
  unblockUser: (id) =>
    request(`/api/users/${encodeURIComponent(id)}/block`, { method: "DELETE" }),
  getBlocks: () => request("/api/users/me/blocks", { method: "GET" }),
  getSuggestions: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/users/me/suggestions${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },
  fileReport: (payload) =>
    request("/api/reports", { method: "POST", body: payload }),
  getFollowers: (id, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(id)}/followers${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getFollowing: (id, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/users/${encodeURIComponent(id)}/following${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  createPost: (text, media, poll, extra = {}) => {
    // media: File | File[] | undefined (images, GIFs, videos).
    // extra: { posters?: Blob[], meta?: [{ width, height, duration }] } —
    // meta aligned by file index; posters[0] is the single video's poster.
    // Old (text, imageFile, poll) calls keep working: a lone File sends as
    // one "media" part.
    const files = Array.isArray(media) ? media : media ? [media] : [];
    const posters = extra?.posters || [];
    const meta = extra?.meta;
    if (files.length) {
      const form = new FormData();
      if (text) form.append("text", text);
      files.forEach((f) => form.append("media", f));
      posters.forEach((p) => {
        if (p) form.append("posters", p, "poster.jpg");
      });
      if (meta) form.append("mediaMeta", JSON.stringify(meta));
      if (poll) form.append("poll", JSON.stringify(poll));
      return request("/api/posts", { method: "POST", form });
    }
    return request("/api/posts", { method: "POST", body: { text, poll } });
  },
  votePoll: (id, optionIndex) =>
    request(`/api/posts/${encodeURIComponent(id)}/vote`, {
      method: "POST",
      body: { optionIndex },
    }),
  getPost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}`, { method: "GET" }),
  updatePost: (id, text) =>
    request(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { text },
    }),
  deletePost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getFeed: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/posts/feed${q ? `?${q}` : ""}`, { method: "GET" });
  },
  getPublicFeed: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/posts/public${q ? `?${q}` : ""}`, { method: "GET" });
  },
  likePost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/like`, { method: "POST" }),
  unlikePost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/like`, { method: "DELETE" }),
  repostPost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/repost`, { method: "POST" }),
  unrepostPost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/repost`, {
      method: "DELETE",
    }),
  bookmarkPost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/bookmark`, {
      method: "POST",
    }),
  unbookmarkPost: (id) =>
    request(`/api/posts/${encodeURIComponent(id)}/bookmark`, {
      method: "DELETE",
    }),
  getBookmarks: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/users/me/bookmarks${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },
  getReplies: (id, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/posts/${encodeURIComponent(id)}/replies${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  createReply: (id, text) =>
    request(`/api/posts/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      body: { text },
    }),
  getTrendingHashtags: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/hashtags/trending${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },
  getPostsByHashtag: (tag, params = {}) => {
    const clean = String(tag || "").replace(/^#+/, "");
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/hashtags/${encodeURIComponent(clean)}/posts${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return request("/api/users/me/avatar", { method: "POST", form });
  },
  uploadCover: (file) => {
    const form = new FormData();
    form.append("cover", file);
    return request("/api/users/me/cover", { method: "POST", form });
  },
  pinPost: (postId) =>
    request("/api/users/me/pin", { method: "POST", body: { postId } }),
  unpinPost: () => request("/api/users/me/pin", { method: "DELETE" }),
  getCollege: (slug) =>
    request(`/api/colleges/${encodeURIComponent(slug)}`, { method: "GET" }),
  listColleges: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/colleges${q ? `?${q}` : ""}`, { method: "GET" });
  },
  getCollegeMembers: (slug, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/colleges/${encodeURIComponent(slug)}/members${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  getCollegePosts: (slug, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(
      `/api/colleges/${encodeURIComponent(slug)}/posts${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
  },
  // Admin dashboard (env-gated via ADMIN_EMAIL + ADMIN_PASSKEY on backend).
  // Uses its own adminToken cookie — no user refresh involved.
  adminLogin: (payload) =>
    request("/api/admin/login", { method: "POST", body: payload }),
  adminLogout: () => request("/api/admin/logout", { method: "POST" }),
  adminMe: () => request("/api/admin/me", { method: "GET" }),
  adminStats: () => request("/api/admin/stats", { method: "GET" }),
  adminReports: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "")
        qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/api/admin/reports${q ? `?${q}` : ""}`, { method: "GET" });
  },
  adminResolveReport: (id, status) =>
    request(`/api/admin/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    }),
  adminDeletePost: (id) =>
    request(`/api/admin/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  adminSuspendUser: (id, reason) =>
    request(`/api/admin/users/${encodeURIComponent(id)}/suspend`, {
      method: "PATCH",
      body: reason ? { reason } : {},
    }),
  adminUnsuspendUser: (id) =>
    request(`/api/admin/users/${encodeURIComponent(id)}/unsuspend`, {
      method: "PATCH",
    }),
};
