import { User } from "../models/User.js";

/**
 * College presence, derived from live SSE connections — no heartbeat infra.
 * A student is "online" while at least one of their tabs holds an open SSE
 * stream for their own college, plus a 45s grace window after the last one
 * closes so a normal tab swap or refresh doesn't flicker them out of the
 * strip.
 *
 * Privacy: private accounts count toward the strip's total but never appear
 * as an avatar bubble. Reactions are per-college only: every member of that
 * college's open streams gets the same snapshot payload.
 */
const GRACE_MS = 45_000;

// collegeSlug -> Map<userId, { connections, timer }>
const byCollege = new Map();
// collegeSlug -> Set<res> (open streams whose owner belongs to the college)
const listeners = new Map();

function clearTimer(entry) {
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}

// Current online state for a college — powers both the SSE payload and the
// initial REST read on page load.
export async function presenceSnapshot(slug) {
  const group = byCollege.get(String(slug).toLowerCase().trim());
  const ids = group ? [...group.keys()] : [];
  if (!ids.length) return { slug, count: 0, users: [] };
  // Count = everyone connected. Avatars = public profiles only, capped at 5.
  const docs = await User.find({ _id: { $in: ids } })
    .select("fullName username avatarUrl isPrivate")
    .lean();
  const users = docs
    .filter((u) => !u.isPrivate)
    .sort((a, b) => String(a._id).localeCompare(String(b._id)))
    .slice(0, 5)
    .map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      username: u.username,
      avatarUrl: u.avatarUrl || null,
    }));
  return { slug, count: ids.length, users };
}

async function broadcast(slug) {
  const resSet = listeners.get(slug);
  if (!resSet || resSet.size === 0) return;
  let data;
  try {
    data = await presenceSnapshot(slug);
  } catch {
    return;
  }
  for (const res of [...resSet]) {
    try {
      // Presence is high-frequency state, not per-user mail: write directly,
      // skip the per-user replay buffer. A reconnecting stream picks the
      // truth up from the active-now REST call.
      res.write(
        `id: p${Date.now()}\nevent: presence\ndata: ${JSON.stringify(data)}\n\n`,
      );
    } catch {
      resSet.delete(res);
    }
  }
  if (resSet.size === 0) listeners.delete(slug);
}

export const presenceService = {
  /** A new tab stream opened for a member of `slug`. */
  async join(userId, collegeSlug) {
    const slug = String(collegeSlug || "").toLowerCase().trim();
    const key = String(userId || "");
    if (!key || key === "undefined" || !slug) return;
    let group = byCollege.get(slug);
    if (!group) {
      group = new Map();
      byCollege.set(slug, group);
    }
    let entry = group.get(key);
    if (!entry) {
      entry = { connections: 0, timer: null };
      group.set(key, entry);
    }
    clearTimer(entry); // at least one live tab — no grace needed
    entry.connections += 1;
    await broadcast(slug);
  },

  /** A tab stream closed. Falls out after the grace window. */
  async leave(userId, collegeSlug) {
    const slug = String(collegeSlug || "").toLowerCase().trim();
    const group = byCollege.get(slug);
    const key = String(userId || "");
    const entry = group?.get(key);
    if (!entry) return;
    entry.connections = Math.max(0, entry.connections - 1);
    if (entry.connections === 0 && !entry.timer) {
      entry.timer = setTimeout(() => {
        entry.timer = null;
        const g = byCollege.get(slug);
        g?.delete(key);
        if (g && g.size === 0) byCollege.delete(slug);
        broadcast(slug).catch(() => {});
      }, GRACE_MS);
    }
  },

  /** Register one open stream to receive this college's presence updates. */
  addListener(res, collegeSlug) {
    const slug = String(collegeSlug || "").toLowerCase().trim();
    if (!slug || !res) return;
    let set = listeners.get(slug);
    if (!set) {
      set = new Set();
      listeners.set(slug, set);
    }
    set.add(res);
  },

  removeListener(res, collegeSlug) {
    const slug = String(collegeSlug || "").toLowerCase().trim();
    const set = listeners.get(slug);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) listeners.delete(slug);
  },

  /** Kick/ban: drop them from the college strip immediately, grace aside. */
  async dropUser(userId, collegeSlug) {
    const slug = String(collegeSlug || "").toLowerCase().trim();
    const group = byCollege.get(slug);
    const key = String(userId || "");
    const entry = group?.get(key);
    if (entry) {
      clearTimer(entry);
      group?.delete(key);
      if (group && group.size === 0) byCollege.delete(slug);
      await broadcast(slug).catch?.(() => {});
    }
  },
};
