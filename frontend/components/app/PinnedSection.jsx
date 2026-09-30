"use client";

import { Pin } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

// pinnedPost arrives in two shapes depending on endpoint:
// - populated object (getByUsername, getMe) → { _id, text, author, ... }
// - bare ObjectId string (any unpopulated user payload)
export function pinnedIdOf(pinnedPost) {
  if (!pinnedPost) return null;
  if (typeof pinnedPost === "string") return pinnedPost;
  if (pinnedPost._id) return String(pinnedPost._id);
  return null;
}

export function splitPinned(posts, pinnedPost) {
  const pinnedId = pinnedIdOf(pinnedPost);
  if (!pinnedId) return { pinnedId: null, list: posts };
  return {
    pinnedId,
    list: posts.filter((p) => String(p._id) !== pinnedId),
  };
}

export function PinnedSection({
  pinnedPost,
  posts,
  currentUser,
  onPinChange,
  onDelete,
  onUpdate,
}) {
  const pinnedId = pinnedIdOf(pinnedPost);
  const fromList = pinnedId
    ? posts.find((p) => String(p._id) === pinnedId)
    : null;
  const isFullObject =
    pinnedPost && typeof pinnedPost === "object" && Boolean(pinnedPost.author);
  const [fetched, setFetched] = useState(null);

  // bare-id shape (or thin object) → fetch the full post so the card renders
  useEffect(() => {
    if (!pinnedId || fromList || isFullObject) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    api
      .getPost(pinnedId)
      .then((r) => {
        if (!cancelled) setFetched(r.data?.post || null);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pinnedId, fromList, isFullObject]);

  const pinned = fromList || (isFullObject ? pinnedPost : fetched);
  if (!pinnedId || !pinned) return null;

  const handleDelete = (id) => {
    onDelete?.(id);
    if (String(id) === String(pinnedId)) onPinChange?.(null);
  };

  return (
    <div>
      <p className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-[13px] leading-[16px] font-bold text-[var(--cz-text-secondary)]">
        <Pin className="h-[13px] w-[13px]" aria-hidden /> Pinned post
      </p>
      <PostCard
        post={pinned}
        currentUser={currentUser}
        isPinned
        onPinChange={onPinChange}
        onDelete={handleDelete}
        onUpdate={onUpdate}
      />
    </div>
  );
}
