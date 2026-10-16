"use client";

import { Ghost, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { useAutogrowTextarea } from "@/components/app/useAutogrowTextarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { MEDIA_LIMITS } from "@/lib/media";
import { cn } from "@/lib/utils";

const MAX = 500;
const ACCEPT_ANON_IMAGES = "image/jpeg,image/png,image/webp";
let itemSeq = 0;

function validateAnonImage(file, count) {
  if (!String(file.type || "").startsWith("image/") || file.type === "image/gif")
    return "Only JPG, PNG or WEBP images are allowed here";
  if (file.size > MEDIA_LIMITS.IMAGE_MAX_BYTES) return "Image must be under 5MB";
  if (count >= MEDIA_LIMITS.MAX_FILES) return `Up to ${MEDIA_LIMITS.MAX_FILES} images per post`;
  return null;
}

export function AnonymousComposer({ user, onCreated }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const fileInputRef = useRef(null);
  const textRef = useRef(null);

  const draftKey = `cz:anon-draft:${user?._id || user?.username || "guest"}`;
  const hydratedKeyRef = useRef(null);

  useEffect(() => {
    if (hydratedKeyRef.current === draftKey) return;
    hydratedKeyRef.current = draftKey;
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) setText(saved);
    } catch {}
  }, [draftKey]);

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

  useEffect(
    () => () => {
      setItems((prev) => {
        prev.forEach((it) => {
          if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        });
        return prev;
      });
    },
    [],
  );

  useAutogrowTextarea(textRef, text, 200);

  const len = text.length;
  const over = len > MAX;
  const hasContent = (len > 0 && len <= MAX) || items.length > 0;
  const canPost = hasContent && !loading && !over;
  const hasMention = /(^|\s)@\w/.test(text);

  const removeItem = (id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFilesSelect = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    for (const file of picked) {
      const err = validateAnonImage(file, items.length);
      if (err) {
        setError(err);
        return;
      }
    }
    if (items.length + picked.length > MEDIA_LIMITS.MAX_FILES) {
      setError(`Up to ${MEDIA_LIMITS.MAX_FILES} images per post`);
      return;
    }
    setError("");
    for (const file of picked) {
      const id = `a-${Date.now()}-${itemSeq++}`;
      setItems((prev) => [...prev, { id, file, previewUrl: URL.createObjectURL(file) }]);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    if (hasMention) {
      setError("@mentions aren't allowed in anonymous posts");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const files = items.map((it) => it.file);
      const res = await api.createAnonymousPost(text.trim() || undefined, files.length ? files : undefined, {
        isSensitive,
      });
      const created = res.data?.post;
      setText("");
      setItems((prev) => {
        for (const it of prev) {
          if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        }
        return [];
      });
      try {
        window.localStorage.removeItem(draftKey);
      } catch {}
      setIsSensitive(false);
      if (created && onCreated) onCreated(created);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Couldn't post. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-b border-[var(--cz-border)] px-4 py-3">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)]">
          <Ghost className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--cz-text-secondary)]">
            <Ghost className="h-3.5 w-3.5" aria-hidden />
            Posting anonymously — only you and admins know it&apos;s you
          </div>
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share campus tea, ask for help, vent… (no @mentions)"
            rows={2}
            maxLength={MAX + 50}
            className="w-full resize-none bg-transparent text-[17px] leading-[24px] outline-none placeholder:text-[var(--cz-text-tertiary)]"
          />
          {items.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {items.map((it) => (
                <div key={it.id} className="relative overflow-hidden rounded-xl border border-[var(--cz-border)]">
                  <CzImage src={it.previewUrl} alt="attachment" className="h-28 w-full" imgClassName="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
          {hasMention && (
            <p className="mt-1 text-[13px] font-medium text-[var(--cz-error)]">@mentions are disabled for anonymous posts</p>
          )}
          {error && <p className="mt-1 text-[13px] font-medium text-[var(--cz-error)]">{error}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept={ACCEPT_ANON_IMAGES} multiple hidden onChange={handleFilesSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add images"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--cz-accent)] hover:bg-[color-mix(in_srgb,var(--cz-accent)_12%,transparent)]"
              >
                <ImageIcon className="h-[18px] w-[18px]" aria-hidden />
              </button>
              <label className={cn("ml-1 flex cursor-pointer items-center gap-1.5 text-[13px] text-[var(--cz-text-secondary)]")}>
                <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} className="h-4 w-4 accent-[var(--cz-accent)]" />
                18+
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-[13px]", over ? "font-bold text-[var(--cz-error)]" : "text-[var(--cz-text-tertiary)]")}>
                {MAX - len}
              </span>
              <Button type="submit" disabled={!canPost} className="h-9 rounded-full px-5 font-bold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
