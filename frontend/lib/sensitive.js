"use client";

const KEY = "cz:revealed-sensitive";

function readSet() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify([...set].slice(-200)));
  } catch {}
  window.dispatchEvent(new CustomEvent("cz:sensitive-revealed"));
}

export function isRevealedSensitive(postId) {
  if (!postId || typeof window === "undefined") return false;
  try {
    return readSet().has(String(postId));
  } catch {
    return false;
  }
}

export function markRevealedSensitive(postId) {
  if (!postId || typeof window === "undefined") return;
  const s = readSet();
  s.add(String(postId));
  writeSet(s);
}

export function hideSensitiveAgain(postId) {
  if (!postId || typeof window === "undefined") return;
  const s = readSet();
  s.delete(String(postId));
  writeSet(s);
}
