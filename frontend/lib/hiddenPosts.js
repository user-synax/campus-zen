// Client-side "hide for me" store for reported posts.
// Server already excludes blocked content; this covers reports
// (stored with status=open for a future admin queue).
const KEY = "cz_hidden_posts";
const MAX = 200;

export function getHiddenPostIds() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function isHiddenPost(id) {
  if (!id) return false;
  try {
    return getHiddenPostIds().has(String(id));
  } catch {
    return false;
  }
}

export function hidePostId(id) {
  if (!id) return;
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    const s = String(id);
    if (!arr.includes(s)) {
      arr.push(s);
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    }
  } catch {}
}
