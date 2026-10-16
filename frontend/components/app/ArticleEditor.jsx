"use client";

import { Eye, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/app/Markdown";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ARTICLE_BODY_MAX, ARTICLE_DESC_MAX, ARTICLE_TITLE_MAX } from "@/lib/articles";
import { cn } from "@/lib/utils";

const fieldLabelClass = "text-[13px] font-bold text-[var(--cz-text-secondary)]";
const fieldCounterClass = "text-[12px] tabular-nums text-[var(--cz-text-secondary)]";

/**
 * Text-only article editor — matches PATCH /articles/:id
 * (title/description/body; slug + cover media stay untouched so
 * ${user/slug} embeds never break).
 */
export function ArticleEditor({ post, onSaved }) {
  const [title, setTitle] = useState(post?.title || "");
  const [description, setDescription] = useState(post?.description || "");
  const [body, setBody] = useState(post?.body || "");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = title.trim();
  const b = body.trim();
  const dirty =
    t !== String(post?.title || "") ||
    description.trim() !== String(post?.description || "") ||
    b !== String(post?.body || "");
  const valid =
    t.length > 0 &&
    t.length <= ARTICLE_TITLE_MAX &&
    description.trim().length <= ARTICLE_DESC_MAX &&
    b.length > 0 &&
    b.length <= ARTICLE_BODY_MAX;
  const canSave = valid && dirty && !loading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.updateArticle(post._id, {
        title: t,
        description: description.trim(),
        body: b,
      });
      onSaved?.(res.data?.post);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Couldn't save changes. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--cz-text-secondary)]">
          Editing <span className="font-mono font-bold text-[var(--cz-text-primary)]">@{post?.author?.username}/{post?.slug}</span>
          {" "}· link stays the same
        </p>
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

      <div className="mx-auto mt-3 w-full max-w-[720px] overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        {!preview ? (
          <>
            <div className="border-b border-[var(--cz-border)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-edit-title" className={fieldLabelClass}>Title</label>
                <span className={cn(fieldCounterClass, title.length >= ARTICLE_TITLE_MAX - 10 && "text-[var(--cz-warn)]")}>
                  {title.length}/{ARTICLE_TITLE_MAX}
                </span>
              </div>
              <input
                id="cz-edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your article a title"
                maxLength={ARTICLE_TITLE_MAX}
                className="cz-input mt-2 h-[52px] w-full rounded-[12px] px-4 text-[19px] font-extrabold leading-[26px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
            </div>
            <div className="border-b border-[var(--cz-border)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-edit-desc" className={fieldLabelClass}>
                  Short description <span className="font-medium text-[var(--cz-text-tertiary)]">· optional</span>
                </label>
                <span className={cn(fieldCounterClass, description.length >= ARTICLE_DESC_MAX - 10 && "text-[var(--cz-warn)]")}>
                  {description.length}/{ARTICLE_DESC_MAX}
                </span>
              </div>
              <textarea
                id="cz-edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line summary"
                rows={2}
                maxLength={ARTICLE_DESC_MAX}
                className="mt-2 max-h-[120px] w-full resize-none overflow-y-auto rounded-[12px] bg-transparent px-4 py-2 text-[15px] leading-[22px] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="cz-edit-body" className={fieldLabelClass}>Body · markdown</label>
                <span className={cn(fieldCounterClass, body.length >= ARTICLE_BODY_MAX - 100 && "text-[var(--cz-warn)]")}>
                  {body.length.toLocaleString("en-IN")}/{ARTICLE_BODY_MAX.toLocaleString("en-IN")}
                </span>
              </div>
              <textarea
                id="cz-edit-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write in markdown…"
                rows={14}
                maxLength={ARTICLE_BODY_MAX}
                className="mt-2 min-h-[280px] w-full resize-y rounded-[12px] bg-transparent px-4 py-2 font-mono text-[14px] leading-[22px] outline-none placeholder:font-sans placeholder:text-[var(--cz-text-secondary)]"
              />
            </div>
          </>
        ) : (
          <div className="p-4">
            <h1 className="break-words text-[24px] font-extrabold leading-[30px]">{t || "Untitled"}</h1>
            {description.trim() ? (
              <p className="mt-2 text-[15px] leading-[24px] text-[var(--cz-text-secondary)]">{description.trim()}</p>
            ) : null}
            <div className="mt-4 border-t border-[var(--cz-border)] pt-4">
              <Markdown body={b} className="cz-article" />
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="mx-auto mt-3 w-full max-w-[720px] text-[13px] font-medium text-[var(--cz-error)]">
          {error}
        </p>
      ) : null}

      <div className="mx-auto mt-3 flex w-full max-w-[720px] items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--cz-text-tertiary)]">Cover media can&apos;t be changed after publishing.</p>
        <Button type="submit" disabled={!canSave} className="h-9 rounded-full px-5 font-bold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
