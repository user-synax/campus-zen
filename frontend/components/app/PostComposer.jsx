"use client";

import { BarChart2, Image as ImageIcon, Loader2, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { useAutogrowTextarea } from "@/components/app/useAutogrowTextarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX = 500;

export function PostComposer({ user, onCreated }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const textRef = useRef(null);

  // Draft persistence — text-only, per user, survives tab switch / close.
  // Images can't go in localStorage, so only text is stored.
  const draftKey = `cz:post-draft:${user?._id || user?.username || "guest"}`;
  const hydratedKeyRef = useRef(null);

  // Restore once per key. Never blank a non-empty box when switching keys
  // (e.g. guest typing before /me loads) — only fill when a saved draft exists.
  useEffect(() => {
    if (hydratedKeyRef.current === draftKey) return;
    hydratedKeyRef.current = draftKey;
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) setText(saved);
    } catch {}
  }, [draftKey]);

  // Save debounced so every keystroke doesn't hit storage.
  useEffect(() => {
    if (hydratedKeyRef.current !== draftKey) return;
    const t = setTimeout(() => {
      try {
        if (text) window.localStorage.setItem(draftKey, text);
        else window.localStorage.removeItem(draftKey);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [text, draftKey]);
  const mention = useMentionAutocomplete({
    value: text,
    setValue: setText,
    inputRef: textRef,
  });
  // Grow with paste/typing up to 200px, then inner scrollbar so long drafts
  // stay reviewable without pushing the feed away.
  useAutogrowTextarea(textRef, text, 200);

  const len = text.length;
  const remaining = MAX - len;
  const over = len > MAX;
  // poll draft (not persisted — text-only drafts per prior choice)
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDays, setPollDays] = useState(1);
  const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollValid =
    pollOpen && cleanOptions.length >= 2 && cleanOptions.every((o) => o.length <= 80);
  const hasContent = (len > 0 && len <= MAX) || image || pollValid;
  const canPost = hasContent && !loading;

  const resetPoll = () => {
    setPollOpen(false);
    setPollOptions(["", ""]);
    setPollDays(1);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const removeImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    if (pollOpen && !pollValid) {
      setError("Add at least 2 poll options (max 80 chars each)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const poll = pollValid ? { options: cleanOptions, durationDays: pollDays } : undefined;
      const res = await api.createPost(text.trim() || undefined, image || undefined, poll);
      setText("");
      removeImage();
      resetPoll();
      try {
        window.localStorage.removeItem(draftKey);
      } catch {}
      window.dispatchEvent(new Event("cz:hashtag-trending"));
      onCreated?.(res.data?.post);
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.fullName || user?.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <form onSubmit={onSubmit} className="cz-row px-4 py-3">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user?.username}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="relative">
            {/* DESIGN.md — the composer is bare text on the surface, not a box. */}
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onSelect={mention.recheck}
              onKeyDown={(e) => {
                if (mention.handleKeyDown(e)) return;
              }}
              onBlur={() => setTimeout(() => mention.close(), 150)}
              placeholder="What's happening?"
              aria-label="Post text"
              rows={2}
              maxLength={520}
              className="max-h-[200px] min-h-[56px] w-full resize-none overflow-y-auto bg-transparent pb-2 text-[20px] leading-[24px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
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

          {imagePreview ? (
            <div className="relative mt-2 inline-block overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Post attachment preview"
                className="max-h-[300px] object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}

          {pollOpen ? (
            <div className="mt-2 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
              <div className="flex items-center justify-between border-b border-[var(--cz-border)] px-3 py-2">
                <span className="text-[14px] font-bold text-[var(--cz-text-primary)]">Poll</span>
                <button
                  type="button"
                  onClick={resetPoll}
                  aria-label="Remove poll"
                  className="grid h-[28px] w-[28px] place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="cz-input flex h-[40px] flex-1 items-center rounded-[8px] px-3">
                      <input
                        value={opt}
                        onChange={(e) =>
                          setPollOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                        }
                        placeholder={`Option ${i + 1}`}
                        maxLength={80}
                        aria-label={`Poll option ${i + 1}`}
                        className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                      />
                    </div>
                    {pollOptions.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove option ${i + 1}`}
                        className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
                {pollOptions.length < 4 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="self-start text-[14px] font-bold text-[var(--cz-accent)] hover:underline"
                  >
                    + Add option
                  </button>
                ) : null}
                <label className="flex items-center gap-2 text-[14px] text-[var(--cz-text-secondary)]">
                  Runs for
                  <select
                    value={pollDays}
                    onChange={(e) => setPollDays(Number(e.target.value))}
                    aria-label="Poll duration"
                    className="cz-input h-[36px] rounded-[8px] bg-transparent px-2 text-[14px] text-[var(--cz-text-primary)] outline-none"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-2 text-[13px] text-[var(--cz-error)]">{error}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pollOpen}
                aria-label="Add image"
                className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ImageIcon className="h-[20px] w-[20px]" strokeWidth={1.9} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPollOpen((v) => !v);
                  setError("");
                }}
                disabled={Boolean(image)}
                aria-label={pollOpen ? "Remove poll" : "Add poll"}
                aria-pressed={pollOpen}
                className={cn(
                  "grid h-[36px] w-[36px] place-items-center rounded-full transition-colors",
                  pollOpen
                    ? "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                    : "text-[var(--cz-accent)] hover:bg-[var(--cz-accent-soft)]",
                  image && "opacity-40 hover:bg-transparent",
                )}
              >
                <BarChart2 className="h-[20px] w-[20px]" strokeWidth={1.9} aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <span
                className={cn(
                  "hidden text-[13px] tabular-nums sm:inline",
                  over
                    ? "text-[var(--cz-error)]"
                    : remaining <= 40
                      ? "text-[var(--cz-warn)]"
                      : "text-[var(--cz-text-secondary)]",
                )}
                aria-live="polite"
              >
                {len}/{MAX}
              </span>
            </div>

            <Button
              type="submit"
              disabled={!canPost}
              size="sm"
              className="min-w-[92px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting
                </>
              ) : (
                <>
                  <Smile className="h-4 w-4" aria-hidden />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
