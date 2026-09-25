const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body, credentials = "include", headers = {} } = {}) {
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
  checkUsername: (username) => request(`/api/auth/check-username?username=${encodeURIComponent(username)}`),
  signup: (payload) => request("/api/auth/signup", { method: "POST", body: payload }),
  verifyEmail: (payload) => request("/api/auth/verify-email", { method: "POST", body: payload }),
  resendOtp: (payload) => request("/api/auth/resend-otp", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me", { method: "GET" }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  forgotPassword: (payload) => request("/api/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) => request("/api/auth/reset-password", { method: "POST", body: payload }),
  getUser: (username) => request(`/api/users/${encodeURIComponent(username)}`, { method: "GET" }),
  updateMe: (payload) => request("/api/users/me", { method: "PATCH", body: payload }),
};
