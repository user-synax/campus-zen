"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function PostComposer({ user, onCreated }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const len = text.length;
  const remaining = 500 - len;
  const over = len > 500;
  const canPost = len > 0 && len <= 500 && !loading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.createPost(text.trim());
      setText("");
      onCreated?.(res.data?.post);
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.fullName || user?.username || "U").trim().slice(0, 1).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 sm:p-4 space-y-3">
      <div className="flex gap-3">
        <span className="hidden sm:grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold shrink-0 overflow-hidden">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user?.username} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What’s on your mind? Share campus thoughts — up to 500 characters, emoji allowed"
            rows={3}
            maxLength={520}
            className="w-full min-h-[72px] resize-none rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-[14px] leading-[20px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] outline-none focus:border-[var(--cz-muted)] focus:shadow-[0_0_0_3px_rgba(125,130,217,0.15)] transition-colors"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`text-[11px] font-medium tracking-[0.04em] uppercase ${over ? "text-[var(--cz-error)]" : remaining <= 20 ? "text-amber-300" : "text-[var(--cz-text-secondary)]/60"}`}>
              {len}/500 {over ? "• Over limit" : remaining <= 50 ? `• ${remaining} left` : ""}
            </span>
            <Button type="submit" disabled={!canPost} size="sm" className="h-[36px] px-4">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Posting…" : "Post"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-[12px] leading-[16px] text-[var(--cz-error)]">{error}</p> : null}
        </div>
      </div>
    </form>
  );
}
