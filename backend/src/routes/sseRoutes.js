import { Router } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

const router = Router();

// Multi-tab safe: userId -> Set<res>
const sseClients = new Map();

// Replay buffer: userId -> [{ id, event, data }] (last 100, in-memory)
const replayBuffers = new Map();
let eventSeq = 0;
const REPLAY_LIMIT = 100;

function bufferEvent(userId, event, data) {
  const id = String(++eventSeq);
  const key = String(userId);
  const arr = replayBuffers.get(key) || [];
  arr.push({ id, event, data });
  if (arr.length > REPLAY_LIMIT) arr.splice(0, arr.length - REPLAY_LIMIT);
  replayBuffers.set(key, arr);
  return id;
}

function writeEvent(res, id, event, data) {
  res.write(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(userId, event, data) {
  const key = String(userId);
  const id = bufferEvent(key, event, data);
  const clients = sseClients.get(key);
  if (!clients || clients.size === 0) return;
  for (const res of [...clients]) {
    try {
      writeEvent(res, id, event, data);
    } catch {
      clients.delete(res);
    }
  }
  if (clients.size === 0) sseClients.delete(key);
}

// Auth for EventSource: cookies (same-origin) OR ?token= / Authorization Bearer
// (cross-origin EventSource can't set custom headers and may not send cookies).
async function protectSSE(req, res, next) {
  try {
    const fromCookie = req.cookies?.accessToken;
    const fromQuery = typeof req.query?.token === "string" ? req.query.token : null;
    const fromHeader = (req.headers.authorization || "").startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = fromCookie || fromQuery || fromHeader;
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Not authenticated" }));
      return;
    }
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Invalid session" }));
      return;
    }
    const user = await User.findById(decoded.id).select("_id");
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "User no longer exists" }));
      return;
    }
    req.user = user;
    next();
  } catch {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Not authenticated" }));
  }
}

/**
 * SSE endpoint for real-time updates.
 * Client connects with: new EventSource(`/api/events?token=${accessToken}`, { withCredentials: true })
 * Server pushes events: notification, unread-count, post:update, follow:update
 * Supports Last-Event-ID replay for reconnects (in-memory, last 100/user).
 */
async function handleSSE(req, res) {
  const userId = req.user._id.toString();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Replay missed events on reconnect
  const lastId = req.headers["last-event-id"];
  if (lastId) {
    const buf = replayBuffers.get(userId) || [];
    const idx = buf.findIndex((e) => e.id === String(lastId));
    const missed = idx >= 0 ? buf.slice(idx + 1) : buf;
    for (const e of missed) writeEvent(res, e.id, e.event, e.data);
  }

  const connectedId = bufferEvent(userId, "connected", { userId, timestamp: Date.now() });
  res.write(`id: ${connectedId}\nevent: connected\ndata: ${JSON.stringify({ userId, timestamp: Date.now() })}\n\n`);

  let set = sseClients.get(userId);
  if (!set) {
    set = new Set();
    sseClients.set(userId, set);
  }
  set.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      set.delete(res);
      if (set.size === 0) sseClients.delete(userId);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (set.size === 0) sseClients.delete(userId);
  });
}

// Primary route: /api/events  (mounted at /api/events)
// Alias: /api/events/events (legacy frontend path — kept for compat)
router.get("/", protectSSE, handleSSE);
router.get("/events", protectSSE, handleSSE);

/**
 * Push a notification event to a specific user (all tabs).
 */
export function pushNotification(userId, data) {
  broadcast(userId, "notification", data);
}

/**
 * Push updated unread count to a specific user (all tabs).
 */
export function pushUnreadCount(userId, count) {
  broadcast(userId, "unread-count", { count });
}

/**
 * Push live post count update to post author + interested viewers.
 * Frontend patches feed/post caches without refetch.
 */
export function pushPostUpdate(userId, data) {
  broadcast(userId, "post:update", data);
}

/**
 * Push live follow count update.
 */
export function pushFollowUpdate(userId, data) {
  broadcast(userId, "follow:update", data);
}

/**
 * Get stats about active SSE connections (for monitoring).
 */
export function getSseStats() {
  let connections = 0;
  for (const s of sseClients.values()) connections += s.size;
  return { activeUsers: sseClients.size, activeConnections: connections };
}

export default router;
