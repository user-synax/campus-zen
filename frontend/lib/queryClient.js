"use client";

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000, // Data considered fresh for 15s
      gcTime: 5 * 60_000, // Keep unused data in memory for 5min
      retry: 1,
      refetchOnWindowFocus: false, // We handle this manually with visibility-aware polling
      refetchOnReconnect: true,
    },
  },
});
