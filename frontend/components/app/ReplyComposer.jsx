"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { useAutogrowTextarea } from "@/components/app/useAutogrowTextarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { withAvatarRing } from "@/lib/avatar";
import { toast } from "sonner";

const MAX = 500;

function initialsFor(u) {
  return (u.fullName || u.username || "U").trim().slice(0, 1).toUpperCase();
}

/**
 * The reply composer for a single post.
 *
 * This used to live inline in PostCard. Replies now belong to the post
 * detail page, so the composer moved with them — the feed stays a pure
 * read-only list of posts.
 */
export function ReplyComposer({
  postId,
  currentUser,
  onCreated,
  autoFocus = false,
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const mention = useMentionAutocomplete({
    value: text,
    setValue: setText,
    inputRef,
  });
  useAutogrowTextarea(inputRef, text, 200);

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || body.length > MAX || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.createReply(postId, body);
      setText("");
      toast.success("Reply posted");
      onCreated?.(res.data?.comment, res.data?.replyCount);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      const msg = err?.data?.message || "Couldn't post your reply. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const over = text.length > MAX;
  const disabled = busy || !text.trim() || over;

  return (
    <form
      onSubmit={submit}
      className="cz-row flex gap-3 border-b border-[var(--cz-border)] px-4 py-3"
    >
      <span className={withAvatarRing(currentUser, "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
        {currentUser?.avatarUrl ? (
          <CzImage
            src={currentUser.avatarUrl}
            alt=""
            className="h-full w-full rounded-full"
            imgClassName="h-full w-full"
          />
        ) : (
          initialsFor(currentUser)
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={mention.recheck}
            onKeyDown={(e) => {
              if (mention.handleKeyDown(e)) return;
              // Enter submits, Shift+Enter newlines, Cmd/Ctrl+Enter always submits.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit(e);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            onBlur={() => setTimeout(() => mention.close(), 150)}
            rows={2}
            autoFocus={autoFocus}
            maxLength={MAX + 40}
            placeholder="Post your reply"
            aria-label="Post your reply"
            className="max-h-[200px] min-h-[52px] w-full resize-none overflow-y-auto bg-transparent py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
          <MentionSuggest
            open={mention.open}
            users={mention.users}
            active={mention.active}
            onSelect={mention.insert}
            onHover={mention.setActive}
          />
        </div>

        {/* text-only replies: mentions supported, media lives on posts */}
        <div className="mt-1 flex items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            {text.length > MAX * 0.75 ? (
              <span
                className={`text-[13px] tabular-nums ${
                  over
                    ? "text-[var(--cz-error)]"
                    : "text-[var(--cz-text-secondary)]"
                }`}
              >
                {MAX - text.length}
              </span>
            ) : null}
            <Button type="submit" size="sm" disabled={disabled}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Reply"
              )}
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-[var(--cz-error)]">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
