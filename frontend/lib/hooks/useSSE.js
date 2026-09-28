"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

/**
 * SSE hook for real-time notifications.
 * Connects to /api/events and listens for notification + unread-count events.
 * Falls back to polling if SSE connection fails.
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const evtSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    // Don't connect if already connected or if user is not logged in
    if (isConnectedRef.current) return;

    // Get access token from cookie
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    if (!token) return;

    // Close existing connection if any
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
    }

    const evtSource = new EventSource(
      `${api.base}/api/events?token=${encodeURIComponent(token)}`
    );
    evtSourceRef.current = evtSource;

    evtSource.addEventListener("connected", () => {
      isConnectedRef.current = true;
    });

    evtSource.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse(e.data);
        // Prepend new notification to cache
        queryClient.setQueryData(["notifications", "all", "all"], (old) => {
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
        // Invalidate unread count
        queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      } catch {}
    });

    evtSource.addEventListener("unread-count", (e) => {
      try {
        const { count } = JSON.parse(e.data);
        queryClient.setQueryData(["unreadCount"], { data: { count } });
      } catch {}
    });

    evtSource.onerror = () => {
      isConnectedRef.current = false;
      evtSource.close();
      // Reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { isConnected: isConnectedRef.current };
}
