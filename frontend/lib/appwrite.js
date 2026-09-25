// DEPRECATED — avatar upload now handled server-side via POST /api/users/me/avatar
// Keep for reference only. Do NOT use NEXT_PUBLIC_APPWRITE_* on frontend (security).
// Backend uses APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY / APPWRITE_BUCKET_ID (no NEXT_PUBLIC prefix) per backend/.env.example
// Frontend now calls api.uploadAvatar(file) which hits backend with credentials.

export function isAppwriteConfigured() {
  // frontend no longer checks — backend checks APPWRITE_* env
  return false;
}
export async function uploadAvatar() {
  throw new Error("Use api.uploadAvatar() via backend — see frontend/lib/api.js");
}
