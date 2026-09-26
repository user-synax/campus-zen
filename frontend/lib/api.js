const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(
  path,
  { method = "GET", body, credentials = "include", headers = {} } = {},
) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    credentials,
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    err.details = data.details;
    throw err;
  }
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
  createPost: async (text, image) => {
    if (image) {
      const form = new FormData();
      if (text) form.append("text", text);
      form.append("image", image);
      const res = await fetch(`${BASE}/api/posts`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message || `Post failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    }
    return request("/api/posts", { method: "POST", body: { text } });
  },
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
  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch(`${BASE}/api/users/me/avatar`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || `Upload failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
};
