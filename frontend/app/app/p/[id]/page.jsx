"use client";

import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/app/PostCard";
import { RichText } from "@/components/app/RichText";
import { api } from "@/lib/api";
import { isHiddenPost } from "@/lib/hiddenPosts";

function formatExact(date) {
  return new Date(date).toLocaleString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [me, setMe] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .me()
      .then((r) => {
        setMe(r.data?.user);
        setIsGuest(false);
      })
      .catch(() => setIsGuest(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getPost(id)
      .then((r) => {
        if (!cancelled) setPost(r.data?.post);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e.data?.message || e.message || "Post not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fetchReplies = async (p = 1) => {
    setRepliesLoading(true);
    try {
      const res = await api.getReplies(id, { page: p, limit: 20 });
      if (p === 1) setReplies(res.data?.comments || []);
      else setReplies((prev) => [...prev, ...(res.data?.comments || [])]);
      setHasMore(Boolean(res.data?.hasMore));
      setPage(p);
    } catch {}
    setRepliesLoading(false);
  };

  useEffect(() => {
    fetchReplies(1);
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[640px] grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto w-full max-w-[640px] space-y-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-6 text-center">
          <p className="text-[14px] font-medium">Post not found</p>
          <p className="text-[12px] text-[var(--cz-text-secondary)] mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (isHiddenPost(post._id)) {
    return (
      <div className="mx-auto w-full max-w-[640px] space-y-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-6 text-center">
          <p className="text-[14px] font-medium">You hid this post</p>
          <p className="text-[12px] text-[var(--cz-text-secondary)] mt-1">
            You reported it and chose not to see it anymore.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <PostCard
        post={post}
        currentUser={me}
        isDetail
        onDelete={() => (window.location.href = "/app")}
        onUpdate={(u) => setPost(u)}
      />

      <div className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-3 flex flex-wrap items-center gap-3 text-[11px] leading-[14px] text-[var(--cz-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> Posted{" "}
          {formatExact(post.createdAt)}
        </span>
        {post.edited ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2 py-1 text-[11px]">
            Edited {formatExact(post.updatedAt)}
          </span>
        ) : null}
        <span className="ml-auto text-[11px]">
          ID:{" "}
          <span className="font-mono text-[var(--cz-text-secondary)]">
            {String(post._id).slice(-6)}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold tracking-[-0.02em]">
          Replies • {post.replyCount || replies.length}
        </h2>
        {isGuest ? (
          <Link
            href="/login"
            className="text-[12px] font-medium text-[var(--cz-muted)] hover:text-[#9aa0ff] underline-offset-4 hover:underline"
          >
            Log in to reply
          </Link>
        ) : null}
      </div>

      {isGuest ? (
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 text-center">
          <p className="text-[13px] font-medium">Join CampusZen to reply</p>
          <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] mt-1">
            Follow, post, and reply with classmates.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[32px] text-[12px] font-medium"
            >
              Join
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-[var(--cz-border)] px-4 h-[32px] text-[12px] font-medium"
            >
              Log in
            </Link>
          </div>
        </div>
      ) : null}

      {repliesLoading && replies.length === 0 ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
        </div>
      ) : replies.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="text-[13px] font-medium">No replies yet</p>
          <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] mt-1">
            Be the first to reply — 500 chars, emoji allowed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((c) => (
            <div
              key={c._id}
              className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4"
            >
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-[var(--cz-muted)] text-white text-[11px] grid place-items-center shrink-0 overflow-hidden">
                  {c.author?.avatarUrl ? (
                    <img
                      src={c.author.avatarUrl}
                      alt={c.author.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (c.author?.username || "U").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="text-[12px] font-semibold">
                  {c.author?.fullName || c.author?.username}
                </span>
                <span className="text-[11px] text-[var(--cz-text-secondary)]">
                  @{c.author?.username}
                </span>
                <span className="text-[10px] text-[var(--cz-text-secondary)]/60 ml-auto">
                  {formatExact(c.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-[20px] whitespace-pre-wrap break-words">
                <RichText text={c.text} />
              </p>
            </div>
          ))}
          {hasMore ? (
            <button
              onClick={() => fetchReplies(page + 1)}
              className="w-full rounded-[12px] border border-[var(--cz-border)] bg-transparent h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)]"
            >
              Load more replies
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-2">
              End • {replies.length} replies
            </p>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60">
        Post page • /app/p/{String(post._id).slice(0, 8)}… • Shareable
      </p>
    </div>
  );
}
