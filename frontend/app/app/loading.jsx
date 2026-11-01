import { PostSkeleton } from "@/components/app/EmptyState";

/**
 * Instant navigation fallback for every /app/* segment (feed, bookmarks,
 * analytics, notifications, profiles, posts…). Two jobs:
 *
 * 1. On a Link click the skeleton paints immediately — no frozen frame.
 * 2. Its presence is what enables partial prefetching of dynamic pages and,
 *    because the router can commit early, the sidebar highlight flips the
 *    moment the click lands instead of when the page data arrives.
 *
 * After hydration each page manages its own finer-grained loading state
 * through React Query, so this only has to cover the await of the route
 * payload itself.
 */
export default function Loading() {
  return <PostSkeleton rows={4} />;
}
