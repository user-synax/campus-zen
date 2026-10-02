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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { CzImage } from "@/components/app/CzImage";
import { PostMedia } from "@/components/app/PostMedia";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { PollBlock } from "@/components/app/PollBlock";
import { ReportDialog } from "@/components/app/ReportDialog";
import { RichText } from "@/components/app/RichText";
import { useAnimatedMount } from "@/components/app/useAnimatedMount";
import { useAutogrowTextarea } from "@/components/app/useAutogrowTextarea";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { withAvatarRing } from "@/lib/avatar";
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
    <span className={withAvatarRing(author, "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
      {author.avatarUrl ? (
        <CzImage
          src={author.avatarUrl}
          alt={author.username}
          className="h-full w-full rounded-full"
          imgClassName="h-full w-full"
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

function OverflowMenu({
  open,
  isOwn,
  isPinned,
  pinLoading,
  post,
  onPin,
  onEdit,
  onDelete,
  onReport,
}) {
  const { show, mountClass } = useAnimatedMount(open);
  if (!show) return null;
  return (
    <div
      role="menu"
      className={`t-menu ${mountClass} absolute right-0 top-8 z-20 w-[232px] overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] py-1 shadow-[var(--shadow-sm)]`}
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
            className={cn(
              menuItemClass,
              "text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]",
            )}
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
  const qc = useQueryClient();
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
  const menuWrapRef = useRef(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  // Dismiss the overflow menu on outside tap or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target))
        setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Counts are local so likes/reposts feel instant, but they must not drift
  // from the server — the detail page bumps replyCount when a reply lands,
  // SSE `post:update` patches the query cache (parent re-renders with new
  // initialPost), and we reconcile here. Local optimistic taps win: only
  // sync when the incoming prop actually differs to avoid clobbering a
  // just-tapped state before the server round-trip returns.
  useEffect(() => {
    if (initialPost.replyCount != null) setReplyCount(initialPost.replyCount);
    setPost((prev) => (prev._id === initialPost._id ? { ...prev, ...initialPost } : initialPost));
  }, [initialPost]);
  useEffect(() => {
    setLiked(Boolean(initialPost.isLiked));
    setLikeCount(initialPost.likeCount || 0);
    setReposted(Boolean(initialPost.isReposted));
    setRepostCount(initialPost.repostCount || 0);
    setSaved(Boolean(initialPost.isBookmarked));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPost._id, initialPost.isLiked, initialPost.likeCount, initialPost.isReposted, initialPost.repostCount, initialPost.isBookmarked]);

  const editRef = useRef(null);
  const editMention = useMentionAutocomplete({
    value: editText || "",
    setValue: setEditText,
    inputRef: editRef,
  });
  useAutogrowTextarea(editRef, editText, 200);

  const isOwn =
    currentUser &&
    String(currentUser._id) === String(post.author?._id || post.author);

  const handleLike = async () => {
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    try {
      const { patchPostEverywhere } = await import("@/lib/optimistic");
      patchPostEverywhere(qc, post._id, {
        isLiked: !wasLiked,
        likeCount: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
      });
    } catch {}
    try {
      const res = wasLiked
        ? await api.unlikePost(post._id)
        : await api.likePost(post._id);
      const serverCount =
        res.data?.likeCount ?? (wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
      const serverLiked = res.data?.liked ?? !wasLiked;
      setLikeCount(serverCount);
      setLiked(serverLiked);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isLiked: serverLiked, likeCount: serverCount });
      } catch {}
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isLiked: wasLiked, likeCount: prevCount });
      } catch {}
      toast.error("Couldn't update like. Try again.");
    }
  };

  const handleRepost = async () => {
    const was = reposted;
    const prevCount = repostCount;
    setReposted(!was);
    setRepostCount((c) => (was ? Math.max(0, c - 1) : c + 1));
    try {
      const { patchPostEverywhere } = await import("@/lib/optimistic");
      patchPostEverywhere(qc, post._id, {
        isReposted: !was,
        repostCount: was ? Math.max(0, prevCount - 1) : prevCount + 1,
      });
    } catch {}
    try {
      const res = was
        ? await api.unrepostPost(post._id)
        : await api.repostPost(post._id);
      const serverCount =
        res.data?.repostCount ?? (was ? Math.max(0, prevCount - 1) : prevCount + 1);
      const serverState = res.data?.reposted ?? !was;
      setRepostCount(serverCount);
      setReposted(serverState);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isReposted: serverState, repostCount: serverCount });
      } catch {}
      toast.success(serverState ? "Reposted to your profile" : "Repost removed");
    } catch {
      setReposted(was);
      setRepostCount(prevCount);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isReposted: was, repostCount: prevCount });
      } catch {}
      toast.error("Couldn't update repost. Try again.");
    }
  };

  const handleBookmark = async () => {
    const was = saved;
    setSaved(!was);
    try {
      const { patchPostEverywhere } = await import("@/lib/optimistic");
      patchPostEverywhere(qc, post._id, { isBookmarked: !was });
    } catch {}
    try {
      const res = was
        ? await api.unbookmarkPost(post._id)
        : await api.bookmarkPost(post._id);
      const serverState = res.data?.bookmarked ?? !was;
      setSaved(serverState);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isBookmarked: serverState });
      } catch {}
      if (!was) qc.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(serverState ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch {
      setSaved(was);
      try {
        const { patchPostEverywhere } = await import("@/lib/optimistic");
        patchPostEverywhere(qc, post._id, { isBookmarked: was });
      } catch {}
      toast.error("Couldn't update bookmark. Try again.");
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
      toast.success("Post updated");
      onUpdate?.(res.data?.post);
    } catch {
      toast.error("Couldn't update post. Try again.");
    }
    setEditLoading(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    toast(`Delete this post?`, {
      description: "This can't be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api.deletePost(post._id);
            toast.success("Post deleted");
            onDelete?.(post._id);
          } catch {
            toast.error("Couldn't delete post. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
      duration: 6000,
    });
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
            (post.text || "").slice(0, 120) ||
            "Check out this post on CampusZen",
          url,
        });
        toast.success("Shared");
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
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link.");
    }
  };

  const handlePinToggle = async () => {
    if (pinLoading) return;
    setMenuOpen(false);
    setPinLoading(true);
    try {
      if (isPinned) {
        await api.unpinPost();
        toast.success("Unpinned from profile");
        onPinChange?.(null);
      } else {
        await api.pinPost(post._id);
        toast.success("Pinned to profile");
        onPinChange?.(post);
      }
    } catch {
      toast.error("Couldn't update pin. Try again.");
    }
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
                <UserBadge user={author} size="sm" />
                <span className="shrink-0 whitespace-nowrap text-[15px] text-[var(--cz-text-secondary)]">
                  <Link href={`/app/p/${post._id}`} className="hover:underline">
                    · {timeAgo(post.createdAt)}
                    {post.edited ? " · edited" : ""}
                  </Link>
                </span>
              </div>

              {!editing ? (
                <div
                  ref={menuWrapRef}
                  className="relative -mr-1 -mt-1 shrink-0"
                >
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More post actions"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                  <OverflowMenu
                    open={menuOpen}
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
                    className="max-h-[200px] w-full resize-none overflow-y-auto rounded-[4px] bg-[var(--cz-surface-strong)] px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none ring-1 ring-[var(--cz-accent)]"
                  />
                  <MentionSuggest
                    open={editMention.open}
                    users={editMention.users}
                    active={editMention.active}
                    onSelect={editMention.insert}
                    onHover={editMention.setActive}
                  />
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

            <PostMedia post={post} />

            {post.poll?.options?.length ? (
              <PollBlock
                postId={post._id}
                poll={post.poll}
                myVote={post.myVote}
                canVote={Boolean(currentUser)}
              />
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

      <ReportDialog
        open={reportOpen}
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
