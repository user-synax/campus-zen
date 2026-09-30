"use client";

import {
  Bookmark,
  Check,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Repeat2,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { RichText } from "@/components/app/RichText";
import { ReportDialog } from "@/components/app/ReportDialog";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { hidePostId, isHiddenPost } from "@/lib/hiddenPosts";
import { cn } from "@/lib/utils";

function timeAgo(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function Avatar({ author }) {
  const initials = (author.fullName || author.username || "U")
    .slice(0, 1)
    .toUpperCase();
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]">
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatarUrl}
          alt={author.username}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

/** DESIGN.md — Dropdown Overlay: floating card, 16px radius, shadow-sm, hover #eff3f4. */
const menuItemClass =
  "flex w-full items-center gap-3 px-4 py-2 text-left text-[15px] leading-[20px] text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50";

function OverflowMenu({ open, setOpen, isOwn, isPinned, pinLoading, post, onPin, onEdit, onDelete, onReport }) {
  if (!open) return null;
  return (
    <div
      role="menu"
      className="absolute right-0 top-8 z-20 w-[232px] overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] py-1 shadow-[var(--shadow-sm)]"
    >
      {isOwn ? (
        <>
          <button
            role="menuitem"
            onClick={onPin}
            disabled={pinLoading}
            className={menuItemClass}
          >
            {isPinned ? (
              <PinOff className="h-[18px] w-[18px] shrink-0" aria-hidden />
            ) : (
              <Pin className="h-[18px] w-[18px] shrink-0" aria-hidden />
            )}
            {isPinned ? "Unpin from profile" : "Pin to profile"}
          </button>
          {post.text ? (
            <button role="menuitem" onClick={onEdit} className={menuItemClass}>
              <Pencil className="h-[18px] w-[18px] shrink-0" aria-hidden />
              Edit post
            </button>
          ) : null}
          <button
            role="menuitem"
            onClick={onDelete}
            className={cn(menuItemClass, "text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]")}
          >
            <Trash2 className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Delete post
          </button>
        </>
      ) : (
        <button
          role="menuitem"
          onClick={onReport}
          className={cn(
            menuItemClass,
            "text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]",
          )}
        >
          <Flag className="h-[18px] w-[18px] shrink-0" aria-hidden />
          Report post
        </button>
      )}
    </div>
  );
}

export function PostCard({
  post: initialPost,
  currentUser,
  onDelete,
  onUpdate,
  isDetail = false,
  isPinned = false,
  onPinChange,
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [liked, setLiked] = useState(Boolean(initialPost.isLiked));
  const [reposted, setReposted] = useState(Boolean(initialPost.isReposted));
  const [saved, setSaved] = useState(Boolean(initialPost.isBookmarked));
  const [likeCount, setLikeCount] = useState(initialPost.likeCount || 0);
  const [repostCount, setRepostCount] = useState(initialPost.repostCount || 0);
  const [replyCount, setReplyCount] = useState(initialPost.replyCount || 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => isHiddenPost(initialPost._id));
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(initialPost.text);
  const [editLoading, setEditLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  // Counts are local so likes/reposts feel instant, but they must not drift
  // from the server — the detail page bumps replyCount when a reply lands,
  // and refetches on delete/undelete.
  useEffect(() => {
    if (initialPost.replyCount != null) setReplyCount(initialPost.replyCount);
  }, [initialPost.replyCount]);

  const editRef = useRef(null);
  const editMention = useMentionAutocomplete({
    value: editText || "",
    setValue: setEditText,
    inputRef: editRef,
  });

  const isOwn =
    currentUser &&
    String(currentUser._id) === String(post.author?._id || post.author);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    try {
      const res = wasLiked
        ? await api.unlikePost(post._id)
        : await api.likePost(post._id);
      setLikeCount(
        res.data?.likeCount ??
          (wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1),
      );
      setLiked(res.data?.liked ?? !wasLiked);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    }
  };

  const handleRepost = async () => {
    const was = reposted;
    setReposted(!was);
    setRepostCount((c) => (was ? Math.max(0, c - 1) : c + 1));
    try {
      const res = was
        ? await api.unrepostPost(post._id)
        : await api.repostPost(post._id);
      setRepostCount(
        res.data?.repostCount ??
          (was ? Math.max(0, repostCount - 1) : repostCount + 1),
      );
      setReposted(res.data?.reposted ?? !was);
    } catch {
      setReposted(was);
      setRepostCount((c) => (was ? c + 1 : Math.max(0, c - 1)));
    }
  };

  const handleBookmark = async () => {
    const was = saved;
    setSaved(!was);
    try {
      const res = was
        ? await api.unbookmarkPost(post._id)
        : await api.bookmarkPost(post._id);
      setSaved(res.data?.bookmarked ?? !was);
    } catch {
      setSaved(was);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim() || editText.trim().length > 500) return;
    setEditLoading(true);
    try {
      const res = await api.updatePost(post._id, editText.trim());
      setPost(res.data?.post);
      setEditText(res.data?.post.text);
      setEditing(false);
      onUpdate?.(res.data?.post);
    } catch {}
    setEditLoading(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(post._id);
      onDelete?.(post._id);
    } catch {}
  };

  const flashCopied = () => {
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/p/${post._id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${post.author?.username || "campuszen"}`,
          text:
            (post.text || "").slice(0, 120) || "Check out this post on CampusZen",
          url,
        });
      } catch {
        // user dismissed the sheet or share failed — stay silent
      }
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      flashCopied();
    } catch {}
  };

  const handlePinToggle = async () => {
    if (pinLoading) return;
    setMenuOpen(false);
    setPinLoading(true);
    try {
      if (isPinned) {
        await api.unpinPost();
        onPinChange?.(null);
      } else {
        await api.pinPost(post._id);
        onPinChange?.(post);
      }
    } catch {}
    setPinLoading(false);
  };

  const author = post.author || {};

  // reported (hidden for me) or blocked content never renders
  if (isHidden) return null;

  return (
    <>
      <article className="cz-row group relative px-4 py-3">
        <div className="flex gap-3">
          <Link href={`/u/${author.username}`} className="shrink-0">
            <Avatar author={author} />
          </Link>
          <div className="min-w-0 flex-1">
            {/* header + overflow */}
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 leading-[20px]">
                <Link
                  href={`/u/${author.username}`}
                  className="truncate text-[15px] font-bold text-[var(--cz-text-primary)] hover:underline"
                >
                  {author.fullName || author.username}
                </Link>
                {author.isEmailVerified ? (
                  <VerifiedBadge size="sm" aria-label="Verified account" />
                ) : null}
                <span className="shrink-0 whitespace-nowrap text-[15px] text-[var(--cz-text-secondary)]">
                  <Link
                    href={`/app/p/${post._id}`}
                    className="hover:underline"
                  >
                    · {timeAgo(post.createdAt)}
                    {post.edited ? " · edited" : ""}
                  </Link>
                </span>
              </div>

              {!editing ? (
                <div className="relative -mr-1 -mt-1 shrink-0">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More post actions"
                    aria-expanded={menuOpen}
                    className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                  <OverflowMenu
                    open={menuOpen}
                    setOpen={setMenuOpen}
                    isOwn={isOwn}
                    isPinned={isPinned}
                    pinLoading={pinLoading}
                    post={post}
                    onPin={handlePinToggle}
                    onEdit={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    onDelete={handleDelete}
                    onReport={() => {
                      setReportOpen(true);
                      setMenuOpen(false);
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* body */}
            {editing ? (
              <form onSubmit={handleEdit} className="mt-2">
                <div className="relative">
                  <textarea
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onSelect={editMention.recheck}
                    onKeyDown={(e) => {
                      if (editMention.handleKeyDown(e)) return;
                    }}
                    onBlur={() => setTimeout(() => editMention.close(), 150)}
                    rows={3}
                    maxLength={500}
                    aria-label="Edit post"
                    className="w-full resize-none rounded-[4px] bg-[var(--cz-surface-strong)] px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none ring-1 ring-[var(--cz-accent)]"
                  />
                  {editMention.open ? (
                    <MentionSuggest
                      users={editMention.users}
                      active={editMention.active}
                      onSelect={editMention.insert}
                      onHover={editMention.setActive}
                    />
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      editLoading ||
                      !editText.trim() ||
                      editText.trim().length > 500
                    }
                  >
                    {editLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </form>
            ) : isDetail ? (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
                <RichText text={post.text} />
              </p>
            ) : (
              <div
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/app/p/${post._id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/app/p/${post._id}`);
                  }
                }}
                className="mt-0.5 block cursor-pointer whitespace-pre-wrap break-words text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none focus-visible:underline"
              >
                <RichText text={post.text} />
              </div>
            )}

            {post.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt="Post attachment"
                  className="max-h-[510px] w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Post Action Bar ──
            Six icon+count groups in Graphite at 18.75px, counts at 13px.
            Repost flips to green, like to pink when active.

            Replies live on the post page only — the reply action navigates
            there rather than expanding anything in the feed. */}
        <div className="ml-[52px] mt-1 flex max-w-[425px] items-center justify-between">
          <button
            onClick={() => router.push(`/app/p/${post._id}`)}
            aria-label={
              replyCount > 0
                ? `Reply — ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
                : "Reply"
            }
            className="group/act -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium text-[var(--cz-text-secondary)] transition-colors hover:cursor-pointer hover:bg-[var(--cz-accent-soft)] hover:text-[var(--cz-accent)]"
          >
            <MessageCircle
              className="h-[18.75px] w-[18.75px] transition-transform group-hover/act:scale-110"
              strokeWidth={1.8}
              aria-hidden
            />
            {replyCount > 0 ? <AnimatedNumber value={replyCount} /> : null}
          </button>

          <button
            onClick={handleRepost}
            data-reposted={reposted ? "true" : "false"}
            aria-label={reposted ? "Undo repost" : "Repost"}
            aria-pressed={reposted}
            className="group/act -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium transition-colors data-[reposted=false]:text-[var(--cz-text-secondary)] hover:cursor-pointer hover:bg-[color-mix(in_srgb,var(--cz-repost)_12%,transparent)] hover:text-[var(--cz-repost)] data-[reposted=true]:text-[var(--cz-repost)]"
          >
            <Repeat2
              className="h-[18.75px] w-[18.75px] transition-transform group-hover/act:scale-110"
              strokeWidth={1.8}
              aria-hidden
            />
            {repostCount > 0 ? <AnimatedNumber value={repostCount} /> : null}
          </button>

          <button
            onClick={handleLike}
            data-liked={liked ? "true" : "false"}
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
            className="t-like group/act -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium transition-colors data-[liked=false]:text-[var(--cz-text-secondary)] hover:cursor-pointer hover:bg-[color-mix(in_srgb,var(--cz-like)_12%,transparent)] hover:text-[var(--cz-like)] data-[liked=true]:text-[var(--cz-like)]"
          >
            <span className="t-like-icon grid place-items-center">
              <Heart
                className="t-like-heart h-[18.75px] w-[18.75px]"
                strokeWidth={1.8}
              />
            </span>
            {likeCount > 0 ? <AnimatedNumber value={likeCount} /> : null}
          </button>

          {/* Views only appears when the API actually reports a count —
              no dead affordances in the action bar. */}
          {post.viewCount != null ? (
            <span className="-ml-2 flex items-center gap-1 px-2 py-1 text-[13px] font-medium text-[var(--cz-text-secondary)]">
              <BarChartIcon />
              <AnimatedNumber value={post.viewCount} />
            </span>
          ) : null}

          <button
            onClick={handleBookmark}
            data-saved={saved ? "true" : "false"}
            aria-label={saved ? "Remove bookmark" : "Bookmark"}
            aria-pressed={saved}
            className="group/act -ml-2 grid place-items-center rounded-full p-2 transition-colors data-[saved=false]:text-[var(--cz-text-secondary)] hover:cursor-pointer hover:bg-[var(--cz-accent-soft)] hover:text-[var(--cz-accent)] data-[saved=true]:text-[var(--cz-accent)]"
          >
            <Bookmark
              className="h-[18.75px] w-[18.75px] transition-transform group-hover/act:scale-110"
              strokeWidth={1.8}
              fill={saved ? "currentColor" : "none"}
              aria-hidden
            />
          </button>

          <button
            onClick={handleShare}
            aria-label={copied ? "Link copied" : "Share post"}
            className="group/act -ml-2 grid place-items-center rounded-full p-2 text-[var(--cz-text-secondary)] transition-colors hover:cursor-pointer hover:bg-[var(--cz-accent-soft)] hover:text-[var(--cz-accent)]"
          >
            {copied ? (
              <Check
                className="h-[18.75px] w-[18.75px] text-[var(--cz-accent)]"
                strokeWidth={1.8}
                aria-hidden
              />
            ) : (
              <Share2
                className="h-[18.75px] w-[18.75px] transition-transform group-hover/act:scale-110"
                strokeWidth={1.8}
                aria-hidden
              />
            )}
          </button>
        </div>
      </article>

      {reportOpen ? (
        <ReportDialog
          targetType="post"
          targetId={post._id}
          targetLabel={`@${author.username || "user"}`}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => {
            hidePostId(post._id);
            setReportOpen(false);
            setIsHidden(true);
          }}
        />
      ) : null}
    </>
  );
}

function BarChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18.75px] w-[18.75px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-6" />
    </svg>
  );
}
