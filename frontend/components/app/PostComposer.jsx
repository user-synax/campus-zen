"use client";

import { Image as ImageIcon, Loader2, Smile, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
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
  const mention = useMentionAutocomplete({
    value: text,
    setValue: setText,
    inputRef: textRef,
  });

  const len = text.length;
  const remaining = MAX - len;
  const over = len > MAX;
  const hasContent = (len > 0 && len <= MAX) || image;
  const canPost = hasContent && !loading;

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
    setError("");
    setLoading(true);
    try {
      const res = await api.createPost(text.trim() || undefined, image || undefined);
      setText("");
      removeImage();
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
              className="w-full resize-none bg-transparent pb-2 text-[20px] leading-[24px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
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

          {error ? (
            <p className="mt-2 text-[13px] text-[var(--cz-error)]">{error}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
                className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
              >
                <ImageIcon className="h-[20px] w-[20px]" strokeWidth={1.9} aria-hidden />
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
