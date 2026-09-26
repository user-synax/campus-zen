"use client";

import { useState, useRef } from "react";
import { Send, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function PostComposer({ user, onCreated }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const len = text.length;
  const remaining = 500 - len;
  const over = len > 500;
  const hasContent = (len > 0 && len <= 500) || image;
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
      const res = await api.createPost(
        text.trim() || undefined,
        image || undefined,
      );
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
    <form
      onSubmit={onSubmit}
      className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 sm:p-4 space-y-3"
    >
      <div className="flex gap-3">
        <span className="hidden sm:grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold shrink-0 overflow-hidden">
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
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind? Share campus thoughts — up to 500 characters, emoji allowed"
            rows={3}
            maxLength={520}
            className="w-full min-h-[72px] resize-none rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-[14px] leading-[20px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] outline-none focus:border-[var(--cz-muted)] focus:shadow-[0_0_0_3px_rgba(125,130,217,0.15)] transition-colors"
          />
          {imagePreview ? (
            <div className="mt-2 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Post attachment"
                className="max-h-[200px] rounded-[12px] border border-[var(--cz-border)] object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1.5 right-1.5 grid place-items-center h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-medium tracking-[0.04em] uppercase ${over ? "text-[var(--cz-error)]" : remaining <= 20 ? "text-amber-300" : "text-[var(--cz-text-secondary)]/60"}`}
              >
                {len}/500{" "}
                {over
                  ? "• Over limit"
                  : remaining <= 50
                    ? `• ${remaining} left`
                    : ""}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-[28px] text-[11px] font-medium tracking-[0.04em] uppercase text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <Button
              type="submit"
              disabled={!canPost}
              size="sm"
              className="h-[36px] px-4"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Posting…" : "Post"}
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-[12px] leading-[16px] text-[var(--cz-error)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
