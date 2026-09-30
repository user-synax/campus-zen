"use client";

import { ImageIcon, Loader2, Smile, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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
export function ReplyComposer({ postId, currentUser, onCreated, autoFocus = false }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const mention = useMentionAutocomplete({ value: text, setValue: setText, inputRef });

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || body.length > MAX || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.createReply(postId, body);
      setText("");
      setFileName("");
      onCreated?.(res.data?.comment, res.data?.replyCount);
    } catch (err) {
      setError(err?.data?.message || "Couldn't post your reply. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
    e.target.value = "";
  };

  const over = text.length > MAX;
  const disabled = busy || !text.trim() || over;

  return (
    <form onSubmit={submit} className="cz-row flex gap-3 border-b border-[var(--cz-border)] px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]">
        {currentUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUser.avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
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
              // Enter submits, Shift+Enter newlines — the chat convention.
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
            className="min-h-[52px] w-full resize-none bg-transparent py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
          {mention.open ? (
            <MentionSuggest
              users={mention.users}
              active={mention.active}
              onSelect={mention.insert}
              onHover={mention.setActive}
            />
          ) : null}
        </div>

        {/* attachment chip — picked but not uploaded, so it reads as intent */}
        {fileName ? (
          <div className="mt-1 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--cz-border)] py-1 pr-1 pl-3 text-[13px] text-[var(--cz-text-secondary)]">
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={() => setFileName("")}
              aria-label="Remove attachment"
              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full hover:bg-[var(--cz-surface-strong)]"
            >
              <X className="h-[13px] w-[13px]" aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Add media"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
            >
              <ImageIcon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() =>
                setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}✨`)
              }
              aria-label="Add emoji"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
            >
              <Smile className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {text.length > MAX * 0.75 ? (
              <span
                className={`text-[13px] tabular-nums ${
                  over ? "text-[var(--cz-error)]" : "text-[var(--cz-text-secondary)]"
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
