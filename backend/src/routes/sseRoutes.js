import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { notificationService } from "../services/notificationService.js";

const router = Router();

// Store active SSE connections: userId -> res
const sseClients = new Map();

/**
 * SSE endpoint for real-time notifications.
 * Client connects with: EventSource(`/api/events?token=${accessToken}`)
 * Server pushes events: notification, unread-count, ping
 */
router.get("/events", protect, async (req, res) => {
  const userId = req.user._id.toString();

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: Date.now() })}\n\n`);

  // Store connection
  sseClients.set(userId, res);

  // Send heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      // Connection dead, cleanup
      clearInterval(heartbeat);
      sseClients.delete(userId);
    }
  }, 25_000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(userId);
  });
});

/**
 * Push a notification event to a specific user.
 * Called by notificationService when a new notification is created.
 */
export function pushNotification(userId, data) {
  const client = sseClients.get(userId);
  if (!client) return;
  try {
    client.write(`event: notification\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    sseClients.delete(userId);
  }
}

/**
 * Push updated unread count to a specific user.
 */
export function pushUnreadCount(userId, count) {
  const client = sseClients.get(userId);
  if (!client) return;
  try {
    client.write(`event: unread-count\ndata: ${JSON.stringify({ count })}\n\n`);
  } catch {
    sseClients.delete(userId);
  }
}

/**
 * Get stats about active SSE connections (for monitoring).
 */
export function getSseStats() {
  return { activeConnections: sseClients.size, userIds: [...sseClients.keys()] };
}

export default router;
