"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

/**
 * SSE for real-time notifications: listens on /api/events and pushes
 * notification + unread-count events into the query cache.
 *
 * The connection is a module-level singleton shared by every caller. Several
 * components want live notifications at once (the shell, the notifications
 * page), and opening one EventSource per caller would multiply the sockets
 * and the reconnect timers. The last consumer to unmount closes it.
 */
let source = null;
let consumers = 0;
let reconnectTimer = null;

function getToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))
    ?.split("=")[1];
}

export function useSSE() {
  const queryClient = useQueryClient();
  // Read live so the handlers always close over the current client without
  // tearing down the socket on every render.
  const clientRef = useRef(queryClient);
  clientRef.current = queryClient;

  useEffect(() => {
    consumers += 1;

    function connect() {
      if (source) return;
      const token = getToken();
      if (!token) return;

      const evtSource = new EventSource(
        `${api.base}/api/events?token=${encodeURIComponent(token)}`
      );
      source = evtSource;

      evtSource.addEventListener("connected", () => {
        // server accepted the stream
      });

      evtSource.addEventListener("notification", (e) => {
        try {
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
          const { count } = JSON.parse(e.data);
          clientRef.current.setQueryData(["unreadCount"], {
            data: { count },
          });
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
