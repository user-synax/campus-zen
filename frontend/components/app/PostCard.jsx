"use client";

import {
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { ReportDialog } from "@/components/app/ReportDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { hidePostId, isHiddenPost } from "@/lib/hiddenPosts";

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

export function PostCard({
  post: initialPost,
  currentUser,
  onDelete,
  onUpdate,
  isDetail = false,
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [liked, setLiked] = useState(Boolean(initialPost.isLiked));
  const [reposted, setReposted] = useState(Boolean(initialPost.isReposted));
  const [likeCount, setLikeCount] = useState(initialPost.likeCount || 0);
  const [repostCount, setRepostCount] = useState(initialPost.repostCount || 0);
  const [replyCount, setReplyCount] = useState(initialPost.replyCount || 0);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => isHiddenPost(initialPost._id));
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(initialPost.text);
  const [editLoading, setEditLoading] = useState(false);

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

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replyText.trim().length > 500) return;
    setReplyLoading(true);
    try {
      const res = await api.createReply(post._id, replyText.trim());
      setReplies((r) => [...r, res.data?.comment]);
      setReplyCount((c) => res.data?.replyCount ?? c + 1);
      setReplyText("");
      setShowReplies(true);
    } catch {}
    setReplyLoading(false);
  };

  const loadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    try {
      const res = await api.getReplies(post._id, { page: 1, limit: 20 });
      setReplies(res.data?.comments || []);
      setShowReplies(true);
    } catch {}
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
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(post._id);
      onDelete?.(post._id);
    } catch {}
  };

  const author = post.author || {};
  const initials = (author.fullName || author.username || "U")
    .slice(0, 1)
    .toUpperCase();

  // reported (hidden for me) or blocked content never renders
  if (isHidden) return null;

  return (
    <article className="group relative rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] hover:border-[var(--cz-border-strong)] transition-colors">
      <div className="flex items-start gap-3 p-3 sm:p-4 pb-2">
        <Link href={`/u/${author.username}`} className="shrink-0">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold overflow-hidden">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.username}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/u/${author.username}`}
              className="text-[13px] font-semibold leading-none hover:underline underline-offset-4 text-[var(--cz-text-primary)] truncate"
            >
              {author.fullName || author.username}
            </Link>
            <span className="text-[12px] leading-none text-[var(--cz-text-secondary)] truncate">
              @{author.username}
            </span>
            <Link
              href={`/app/p/${post._id}`}
              className="text-[11px] leading-none text-[var(--cz-text-secondary)]/60 hover:text-[var(--cz-text-primary)] hover:underline underline-offset-4"
            >
              · {timeAgo(post.createdAt)} {post.edited ? "· edited" : ""}
            </Link>
          </div>
          {editing ? (
            <form onSubmit={handleEdit} className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[14px] leading-[20px] outline-none focus:border-[var(--cz-muted)]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--cz-text-secondary)]/60">
                  {editText.length}/500
                </span>
                <span className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                    className="h-[32px]"
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
                    className="h-[32px]"
                  >
                    {editLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </span>
              </div>
            </form>
          ) : isDetail ? (
            <p className="mt-1.5 text-[14px] leading-[20px] whitespace-pre-wrap break-words text-[var(--cz-text-primary)]">
              {post.text}
            </p>
          ) : (
            <Link
              href={`/app/p/${post._id}`}
              className="mt-1.5 block text-[14px] leading-[20px] whitespace-pre-wrap break-words text-[var(--cz-text-primary)] hover:opacity-90 cursor-pointer"
            >
              {post.text}
            </Link>
          )}
          {post.imageUrl ? (
            <div className="mt-2 rounded-[12px] overflow-hidden border border-[var(--cz-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt="Post attachment"
                className="w-full max-h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>
        {!editing ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Post actions"
              aria-expanded={menuOpen}
              className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                {/* desktop dropdown */}
                <div className="hidden sm:block absolute right-0 top-9 z-10 w-[160px] rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
                  {isOwn && post.text ? (
                    <>
                      <button
                        onClick={() => {
                          setEditing(true);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 h-[36px] text-[13px] hover:bg-[rgba(255,206,173,0.06)] text-left"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 h-[36px] text-[13px] hover:bg-[rgba(255,90,106,0.08)] text-[var(--cz-error)] text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setReportOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 h-[36px] text-[13px] hover:bg-[rgba(255,206,173,0.06)] text-left"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report
                    </button>
                  )}
                </div>
                {/* mobile bottom-sheet + backdrop */}
                <div className="sm:hidden fixed inset-0 z-40 flex items-end justify-center p-3">
                  <button
                    aria-label="Close"
                    onClick={() => setMenuOpen(false)}
                    className="absolute inset-0 bg-black/50 backdrop-blur-[1px] border-0"
                  />
                  <div className="relative w-full max-w-[420px] rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-[t-panel-slide] p-2">
                    <div className="mx-auto h-1 w-8 rounded-full bg-[var(--cz-border)] mb-2" />
                    {isOwn && post.text ? (
                      <>
                        <button
                          onClick={() => {
                            setEditing(true);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 h-[44px] text-[14px] hover:bg-[rgba(255,206,173,0.06)] rounded-[10px] text-left"
                        >
                          <Pencil className="h-4 w-4" /> Edit post
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full flex items-center gap-3 px-3 h-[44px] text-[14px] hover:bg-[rgba(255,90,106,0.08)] text-[var(--cz-error)] rounded-[10px] text-left"
                        >
                          <Trash2 className="h-4 w-4" /> Delete post
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setReportOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 h-[44px] text-[14px] hover:bg-[rgba(255,206,173,0.06)] rounded-[10px] text-left"
                      >
                        <Flag className="h-4 w-4" /> Report post
                      </button>
                    )}
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-3 h-[44px] text-[13px] rounded-[10px] border border-[var(--cz-border)] hover:bg-[rgba(255,206,173,0.06)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
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
      </div>

      <div className="flex items-center gap-1 px-2 sm:px-3 pb-2">
        <button
          onClick={handleLike}
          data-liked={liked ? "true" : "false"}
          className="t-like inline-flex items-center gap-1.5 rounded-full px-2.5 h-[32px] text-[12px] font-medium hover:bg-[rgba(244,0,81,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] data-[liked=true]:text-[var(--like-color)] transition-colors"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <span className="t-like-icon grid place-items-center">
            <Heart className="t-like-heart h-[16px] w-[16px]" />
          </span>
          <AnimatedNumber value={likeCount} />
        </button>

        <button
          onClick={() => setShowReply((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-[32px] text-[12px] font-medium hover:bg-[rgba(125,130,217,0.12)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
        >
          <MessageCircle className="h-[16px] w-[16px]" />
          <AnimatedNumber value={replyCount} />
        </button>

        <button
          onClick={handleRepost}
          data-reposted={reposted ? "true" : "false"}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-[32px] text-[12px] font-medium hover:bg-[rgba(125,130,217,0.12)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] data-[reposted=true]:text-[var(--cz-muted)] transition-colors"
        >
          <Repeat2 className="h-[16px] w-[16px]" />
          <AnimatedNumber value={repostCount} />
        </button>

        <button
          onClick={loadReplies}
          className="ml-auto text-[11px] font-medium tracking-[0.04em] uppercase text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] px-2"
        >
          {showReplies
            ? "Hide replies"
            : replyCount > 0
              ? `View ${replyCount} replies`
              : "Reply"}
        </button>
      </div>

      <div
        className={`t-panel-slide mx-3 sm:mx-4 mb-3 ${showReply ? "block" : "hidden"}`}
        data-open={showReply ? "true" : "false"}
      >
        <form
          onSubmit={handleReply}
          className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] p-3 flex gap-2"
        >
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply… up to 500, emoji allowed"
            maxLength={500}
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--cz-text-secondary)]/50 h-[36px]"
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              replyLoading || !replyText.trim() || replyText.trim().length > 500
            }
            className="h-[36px] px-3 shrink-0"
          >
            {replyLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Reply
          </Button>
        </form>
      </div>

      {showReplies && replies.length > 0 ? (
        <div className="mx-3 sm:mx-4 mb-3 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-bg)] divide-y divide-[var(--cz-border)]/50 overflow-hidden">
          {replies.map((c) => (
            <div key={c._id} className="p-3 flex gap-2">
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold truncate">
                    {c.author?.fullName || c.author?.username}
                  </span>
                  <span className="text-[11px] text-[var(--cz-text-secondary)] truncate">
                    @{c.author?.username}
                  </span>
                  <span className="text-[10px] text-[var(--cz-text-secondary)]/60">
                    · {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] leading-[18px] whitespace-pre-wrap break-words mt-1">
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
