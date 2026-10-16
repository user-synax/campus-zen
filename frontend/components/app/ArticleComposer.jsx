"use client";

import { Eye, ImagePlus, Loader2, PenLine, X } from "lucide-react";
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

const fieldLabelClass = "text-[13px] font-bold text-[var(--cz-text-secondary)]";
const fieldCounterClass = "text-[12px] tabular-nums text-[var(--cz-text-secondary)]";

export function ArticleComposer({ user, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const fileInputRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const bodyRef = useRef(null);

  const slugPreview = useMemo(() => slugifyArticleClient(title || "untitled"), [title]);
  const mentionPath = `${user?.username || "you"}/${slugPreview}`;
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
        files.length ? { posters, meta: hasMeta ? meta : undefined, isSensitive } : { isSensitive },
      );
      setTitle("");
      setDescription("");
      setBody("");
      setPreview(false);
      setItems([]);
      setIsSensitive(false);
      onCreated?.(res.data?.post);
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to publish article");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.fullName || user?.username || "U").trim().slice(0, 1).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="px-4 py-4">
      {/* ── Composer head: who's writing + write/preview ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={withAvatarRing(user, "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
            {user?.avatarUrl ? <CzImage src={user.avatarUrl} alt={user?.username} className="h-full w-full rounded-full" imgClassName="h-full w-full" /> : initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">
              Writing as @{user?.username || "you"}
            </p>
            <p className="truncate text-[13px] text-[var(--cz-text-secondary)]">
              Long-form · Markdown · up to 50k characters
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          aria-pressed={preview}
          className={cn(
            "inline-flex h-[32px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors",
            preview
              ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
              : "border-[var(--cz-border-strong)] text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]",
          )}
        >
          {preview ? <PenLine className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
          {preview ? "Write" : "Preview"}
        </button>
      </div>

      {/* ── Editor card: labelled, visible fields ── */}
      <div className="mx-auto mt-3 w-full max-w-[720px] overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        {!preview ? (
          <>
            <div className="border-b border-[var(--cz-border)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-article-title" className={fieldLabelClass}>
                  Title
                </label>
                <span className={cn(fieldCounterClass, title.length >= ARTICLE_TITLE_MAX - 10 && "text-[var(--cz-warn)]")}>
                  {title.length}/{ARTICLE_TITLE_MAX}
                </span>
              </div>
              <input
                id="cz-article-title"
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    descRef.current?.focus();
                  }
                }}
                placeholder="Give your article a title"
                maxLength={ARTICLE_TITLE_MAX}
                className="cz-input mt-2 h-[52px] w-full rounded-[12px] px-4 text-[19px] font-extrabold leading-[26px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
              <p className="mt-1.5 truncate text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
                Link: /app/a/{mentionPath} · embed anywhere with <span className="font-mono">{"${"}{mentionPath}{"}"}</span>
              </p>
            </div>

            <div className="border-b border-[var(--cz-border)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-article-desc" className={fieldLabelClass}>
                  Short description <span className="font-medium text-[var(--cz-text-tertiary)]">· optional</span>
                </label>
                <span className={cn(fieldCounterClass, description.length >= ARTICLE_DESC_MAX - 10 && "text-[var(--cz-warn)]")}>
                  {description.length}/{ARTICLE_DESC_MAX}
                </span>
              </div>
              <textarea
                id="cz-article-desc"
                ref={descRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    bodyRef.current?.focus();
                  }
                }}
                placeholder="One or two lines that make people tap — shown on feed and search cards."
                maxLength={ARTICLE_DESC_MAX}
                rows={2}
                className="cz-input mt-2 min-h-[64px] w-full resize-none rounded-[12px] px-4 py-2.5 text-[15px] leading-[21px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
            </div>

            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-article-body" className={fieldLabelClass}>
                  Body · Markdown
                </label>
                <span className={fieldCounterClass}>
                  {body.length}/{ARTICLE_BODY_MAX}
                </span>
              </div>
              <textarea
                id="cz-article-body"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
                placeholder={`Start writing — # headings, **bold**, \`code\`, - lists, tables, and \${${mentionPath}} embeds another article.`}
                maxLength={ARTICLE_BODY_MAX}
                rows={14}
                className="cz-input mt-2 min-h-[280px] w-full resize-y rounded-[12px] px-4 py-3 font-mono text-[13.5px] leading-[21px] text-[var(--cz-text-primary)] outline-none placeholder:font-sans placeholder:text-[var(--cz-text-secondary)]"
              />
              <p className="mt-1.5 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
                Cmd/Ctrl + Enter publishes. Enter moves between fields.
              </p>
            </div>
          </>
        ) : (
          <div className="p-5">
            <h1 className="break-words text-[24px] leading-[30px] font-extrabold tracking-tight text-[var(--cz-text-primary)]">
              {title.trim() || "Untitled"}
            </h1>
            {description.trim() ? (
              <p className="mt-2 text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">{description.trim()}</p>
            ) : null}
            <div className="mt-4 border-t border-[var(--cz-border)] pt-4">
              <Markdown body={body} className="cz-article" />
            </div>
          </div>
        )}

        {items.length ? (
          <div className="border-t border-[var(--cz-border)] p-4">
            <div className={cn("grid gap-1 overflow-hidden rounded-[12px] border border-[var(--cz-border)]", items.length > 1 && "grid-cols-2")}>
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
          </div>
        ) : null}

        {error || isSensitive ? (
          <div className="flex flex-col gap-1 border-t border-[var(--cz-border)] px-4 py-3">
            {error ? <p role="alert" className="text-[13px] text-[var(--cz-error)]">{error}</p> : null}
            {isSensitive ? (
              <p className="text-[13px] font-bold text-[var(--cz-error)]">
                Marked 18+ — cover media will be blurred unless viewers enable Show 18+.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ── Footer: attachments, sensitive flag, publish ──
            Wraps on small screens: actions on one line, a full-width
            Publish pill on the next — never a squeezed, breaking label. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cz-border)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={items.length >= MEDIA_LIMITS.MAX_FILES}
              className="inline-flex h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--cz-border-strong)] px-3 text-[13px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ImagePlus className="h-[15px] w-[15px]" aria-hidden />
              {items.length ? `Cover ${items.length}/${MEDIA_LIMITS.MAX_FILES}` : "Add cover media"}
            </button>
            <button
              type="button"
              onClick={() => setIsSensitive((v) => !v)}
              aria-pressed={isSensitive}
              aria-label={isSensitive ? "Unmark as 18+" : "Mark as 18+"}
              title="Mark cover media as 18+"
              className={cn(
                "grid h-[32px] min-w-[48px] shrink-0 place-items-center rounded-full border px-2 text-[13px] font-extrabold tracking-wide transition-colors",
                isSensitive
                  ? "border-[var(--cz-error)] bg-[var(--cz-error)] text-white"
                  : "border-[var(--cz-border-strong)] text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]",
              )}
            >
              18+
            </button>
            <input ref={fileInputRef} type="file" accept={ACCEPT_POST_MEDIA} multiple onChange={handleFilesSelect} className="hidden" />
          </div>
          <Button type="submit" disabled={!canPost} size="sm" className="min-w-[140px] shrink-0 max-sm:w-full">
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
    </form>
  );
}
