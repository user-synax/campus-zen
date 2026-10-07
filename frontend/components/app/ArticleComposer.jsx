"use client";

import { Eye, Loader2, PenLine, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { Markdown } from "@/components/app/Markdown";
import { Button } from "@/components/ui/button";
import { withAvatarRing } from "@/lib/avatar";
import { api } from "@/lib/api";
import { ARTICLE_BODY_MAX, ARTICLE_DESC_MAX, ARTICLE_TITLE_MAX, slugifyArticleClient } from "@/lib/articles";
import { ACCEPT_POST_MEDIA, MEDIA_LIMITS, formatDuration, generateVideoPoster, getVideoMetadata, kindOfFile, validatePostFile } from "@/lib/media";
import { cn } from "@/lib/utils";

let itemSeq = 0;

export function ArticleComposer({ user, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const slugPreview = useMemo(() => slugifyArticleClient(title || "untitled"), [title]);
  const canPost =
    !loading &&
    title.trim().length > 0 &&
    title.trim().length <= ARTICLE_TITLE_MAX &&
    description.trim().length <= ARTICLE_DESC_MAX &&
    body.trim().length > 0 &&
    body.trim().length <= ARTICLE_BODY_MAX;

  const handleFilesSelect = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const kinds = items.map((it) => it.kind);
    const slotsLeft = MEDIA_LIMITS.MAX_FILES - items.length;
    if (picked.length > slotsLeft) {
      setError(`Up to ${MEDIA_LIMITS.MAX_FILES} attachments per article`);
      return;
    }
    for (const file of picked) {
      const err = validatePostFile(file, [...kinds, ...picked.slice(0, picked.indexOf(file)).map(kindOfFile)]);
      if (err) {
        setError(err);
        return;
      }
    }
    const batchKinds = picked.map(kindOfFile);
    if (batchKinds.includes("video") && (items.length > 0 || picked.length > 1)) {
      setError("Video can't be combined with other media");
      return;
    }
    setError("");
    for (const file of picked) {
      const kind = kindOfFile(file);
      if (kind === "video") {
        const id = `v-${Date.now()}-${itemSeq++}`;
        setItems((prev) => [...prev, { id, file, previewUrl: URL.createObjectURL(file), kind, probing: true }]);
        try {
          const meta = await getVideoMetadata(file);
          if (meta.duration > MEDIA_LIMITS.VIDEO_MAX_DURATION_S + 2) {
            setItems((prev) => prev.filter((x) => x.id !== id));
            setError("Video must be 60 seconds or less");
            return;
          }
          let posterBlob = null;
          try {
            const gen = await generateVideoPoster(file);
            posterBlob = gen.blob || null;
            setItems((prev) => prev.map((x) => (x.id === id ? { ...x, probing: false, width: gen.width, height: gen.height, duration: gen.duration || meta.duration, posterBlob } : x)));
          } catch {
            setItems((prev) => prev.map((x) => (x.id === id ? { ...x, probing: false, width: meta.width, height: meta.height, duration: meta.duration } : x)));
          }
        } catch {
          setItems((prev) => prev.filter((x) => x.id !== id));
          setError("Couldn't read that video");
          return;
        }
      } else {
        const id = `i-${Date.now()}-${itemSeq++}`;
        setItems((prev) => [...prev, { id, file, previewUrl: URL.createObjectURL(file), kind }]);
      }
    }
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    if (items.some((it) => it.probing)) {
      setError("Still reading your video — try again in a second");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const files = items.map((it) => it.file);
      const posters = items.map((it) => it.posterBlob || null);
      const meta = items.map((it) => ({ width: it.width || undefined, height: it.height || undefined, duration: it.duration || undefined }));
      const hasMeta = meta.some((m) => m.width || m.height || m.duration);
      const res = await api.createArticle(
        { title: title.trim(), description: description.trim(), body: body.trim() },
        files.length ? files : undefined,
        files.length ? { posters, meta: hasMeta ? meta : undefined } : {},
      );
      setTitle("");
      setDescription("");
      setBody("");
      setPreview(false);
      setItems([]);
      onCreated?.(res.data?.post);
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to publish article");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.fullName || user?.username || "U").trim().slice(0, 1).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="border-b border-[var(--cz-border)] px-4 py-3">
      <div className="flex gap-3">
        <span className={withAvatarRing(user, "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
          {user?.avatarUrl ? <CzImage src={user.avatarUrl} alt={user?.username} className="h-full w-full rounded-full" imgClassName="h-full w-full" /> : initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[var(--cz-accent)]">Article mode · markdown supported</span>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="inline-flex h-[32px] items-center gap-1.5 rounded-full border border-[var(--cz-border-strong)] px-3 text-[13px] font-bold text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]"
            >
              {preview ? <PenLine className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
              {preview ? "Write" : "Preview"}
            </button>
          </div>

          {!preview ? (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title — e.g. opencode"
                maxLength={ARTICLE_TITLE_MAX}
                aria-label="Article title"
                className="w-full bg-transparent text-[20px] font-extrabold leading-[26px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
              <p className="mt-0.5 text-[12px] text-[var(--cz-text-secondary)]">
                {title.trim().length}/{ARTICLE_TITLE_MAX} · slug: @{user?.username || "you"}/{slugPreview} · mention anywhere with {"${"}
                {user?.username || "you"}/{slugPreview}
                {"}"}
              </p>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional, max 200) — shows on the preview card"
                maxLength={ARTICLE_DESC_MAX + 20}
                aria-label="Article description"
                className="mt-2 w-full bg-transparent text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write in markdown… # headings, **bold**, `code`, ```blocks```, - lists, tables, ${user/opencode} mentions"
                rows={10}
                aria-label="Article body markdown"
                className="mt-2 min-h-[220px] w-full resize-y rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 font-mono text-[14px] leading-[22px] text-[var(--cz-text-primary)] outline-none placeholder:font-sans focus:border-[var(--cz-accent)]"
              />
            </>
          ) : (
            <div className="rounded-[12px] border border-[var(--cz-border)] p-4">
              <h1 className="text-[22px] font-extrabold leading-[28px] text-[var(--cz-text-primary)]">{title.trim() || "Untitled"}</h1>
              {description.trim() ? <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">{description.trim()}</p> : null}
              <div className="mt-3 border-t border-[var(--cz-border)] pt-3">
                <Markdown body={body} />
              </div>
            </div>
          )}

          {items.length ? (
            <div className={cn("mt-2 grid gap-1 overflow-hidden rounded-[16px] border border-[var(--cz-border)]", items.length > 1 && "grid-cols-2")}>
              {items.map((it) => (
                <div key={it.id} className="relative overflow-hidden bg-black/5">
                  {it.kind === "video" ? (
                    <video src={it.previewUrl} preload="metadata" playsInline muted className="max-h-[300px] w-full object-cover" />
                  ) : (
                    <img src={it.previewUrl} alt={`${it.kind} attachment preview`} className="max-h-[300px] w-full object-cover" />
                  )}
                  <button type="button" onClick={() => removeItem(it.id)} aria-label="Remove attachment" className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white hover:bg-black/85">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  {it.duration ? (
                    <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[12px] font-bold text-white tabular-nums">{formatDuration(it.duration)}</span>
                  ) : null}
                  {it.probing ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/30">
                      <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p role="alert" className="mt-2 text-[13px] text-[var(--cz-error)]">{error}</p> : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={items.length >= MEDIA_LIMITS.MAX_FILES} className="text-[13px] font-bold text-[var(--cz-accent)] hover:underline disabled:opacity-40">
                {items.length ? `${items.length}/${MEDIA_LIMITS.MAX_FILES} cover media` : "Add cover media"}
              </button>
              <input ref={fileInputRef} type="file" accept={ACCEPT_POST_MEDIA} multiple onChange={handleFilesSelect} className="hidden" />
              <span className="text-[12px] text-[var(--cz-text-secondary)] tabular-nums">{body.trim().length}/{ARTICLE_BODY_MAX}</span>
            </div>
            <Button type="submit" disabled={!canPost} size="sm" className="min-w-[140px]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing
                </>
              ) : (
                "Publish article"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
