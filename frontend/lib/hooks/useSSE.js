"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

/**
 * SSE for real-time updates: notifications + live post/follow counts.
 * Listens on /api/events (primary) with ?token= fallback for cross-origin
 * EventSource (cookies may not flow). Singleton shared by shell + pages.
 *
 * Events:
 * - notification -> prepend to notifications cache
 * - unread-count -> patch badge
 * - post:update { postId, likeCount?, repostCount?, replyCount?, viewCount? } -> patch all post caches
 * - follow:update { userId, followersCount?, isFollowing? } -> patch user caches
 */

let source = null;
let consumers = 0;
let reconnectTimer = null;
let lastEventId = null;

function getToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))
    ?.split("=")[1];
}

export function useSSE() {
  const queryClient = useQueryClient();
  const clientRef = useRef(queryClient);
  clientRef.current = queryClient;

  useEffect(() => {
    consumers += 1;

    function connect() {
      if (source) return;
      const token = getToken();
      if (!token) return;

      const evtSource = new EventSource(
        `${api.base}/api/events?token=${encodeURIComponent(token)}`,
        // withCredentials lets same-origin deployments also send cookies
      );
      source = evtSource;

      evtSource.addEventListener("connected", () => {});

      evtSource.addEventListener("notification", (e) => {
        try {
          lastEventId = e.lastEventId || lastEventId;
          const data = JSON.parse(e.data);
          const client = clientRef.current;
          client.setQueryData(["notifications", "all", "all"], (old) => {
            if (!old) return old;
            const newPages = [...old.pages];
            if (newPages.length > 0) {
              const firstPage = newPages[0];
              const existingIds = new Set(
                (firstPage.data?.notifications || []).map((n) => n._id)
              );
              if (!existingIds.has(data._id)) {
                newPages[0] = {
                  ...firstPage,
                  data: {
                    ...firstPage.data,
                    notifications: [data, ...(firstPage.data?.notifications || [])],
                  },
                };
              }
            }
            return { ...old, pages: newPages };
          });
          client.invalidateQueries({ queryKey: ["unreadCount"] });
        } catch {}
      });

      evtSource.addEventListener("unread-count", (e) => {
        try {
          lastEventId = e.lastEventId || lastEventId;
          const { count } = JSON.parse(e.data);
          clientRef.current.setQueryData(["unreadCount"], {
            data: { count },
          });
        } catch {}
      });

      evtSource.addEventListener("post:update", async (e) => {
        try {
          lastEventId = e.lastEventId || lastEventId;
          const data = JSON.parse(e.data);
          if (!data?.postId) return;
          const { patchPostEverywhere } = await import("../optimistic.js");
          const patch = {};
          if (data.likeCount != null) patch.likeCount = data.likeCount;
          if (data.repostCount != null) patch.repostCount = data.repostCount;
          if (data.replyCount != null) patch.replyCount = data.replyCount;
          if (data.viewCount != null) patch.viewCount = data.viewCount;
          if (Object.keys(patch).length === 0) return;
          patchPostEverywhere(clientRef.current, data.postId, patch);
        } catch {}
      });

      evtSource.addEventListener("follow:update", async (e) => {
        try {
          lastEventId = e.lastEventId || lastEventId;
          const data = JSON.parse(e.data);
          if (!data?.userId) return;
          const { patchUserEverywhere } = await import("../optimistic.js");
          const patch = {};
          if (data.followersCount != null) patch.followersCount = data.followersCount;
          if (data.isFollowing != null) patch.isFollowing = data.isFollowing;
          if (Object.keys(patch).length === 0) return;
          patchUserEverywhere(clientRef.current, data.userId, patch);
        } catch {}
      });

      evtSource.onerror = () => {
        close();
        if (consumers > 0 && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (consumers > 0) connect();
          }, 5000);
        }
      };
    }

    function close() {
      if (source) {
        source.close();
        source = null;
      }
    }

    connect();

    return () => {
      consumers = Math.max(0, consumers - 1);
      if (consumers === 0) {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        close();
      }
    };
  }, []);
}
