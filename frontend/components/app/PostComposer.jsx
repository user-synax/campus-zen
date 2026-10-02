"use client";

import {
  BarChart2,
  Film,
  Image as ImageIcon,
  Loader2,
  Smile,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import {
  MentionSuggest,
  useMentionAutocomplete,
} from "@/components/app/MentionAutocomplete";
import { useAutogrowTextarea } from "@/components/app/useAutogrowTextarea";
import { Button } from "@/components/ui/button";
import { withAvatarRing } from "@/lib/avatar";
import { api } from "@/lib/api";
import {
  ACCEPT_POST_MEDIA,
  MEDIA_LIMITS,
  formatDuration,
  generateVideoPoster,
  getVideoMetadata,
  kindOfFile,
  validatePostFile,
} from "@/lib/media";
import { cn } from "@/lib/utils";

const MAX = 500;

let itemSeq = 0;

export function PostComposer({ user, onCreated }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const textRef = useRef(null);

  // Draft persistence — text-only, per user, survives tab switch / close.
  // Media can't go in localStorage, so only text is stored.
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

  // Revoke blob URLs on unmount so multi-preview sessions don't leak.
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
    pollOpen &&
    cleanOptions.length >= 2 &&
    cleanOptions.every((o) => o.length <= 80);
  const hasContent = (len > 0 && len <= MAX) || items.length > 0 || pollValid;
  const canPost = hasContent && !loading;

  const resetPoll = () => {
    setPollOpen(false);
    setPollOptions(["", ""]);
    setPollDays(1);
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearItems = () => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      });
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFilesSelect = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    if (pollOpen) {
      setError("Remove the poll to add photos, GIFs or video");
      return;
    }

    const kinds = items.map((it) => it.kind);
    const slotsLeft = MEDIA_LIMITS.MAX_FILES - items.length;
    if (picked.length > slotsLeft) {
      setError(`Up to ${MEDIA_LIMITS.MAX_FILES} attachments per post`);
      return;
    }

    for (const file of picked) {
      const err = validatePostFile(file, [
        ...kinds,
        ...picked.slice(0, picked.indexOf(file)).map(kindOfFile),
      ]);
      if (err) {
        setError(err);
        return;
      }
    }
    // Video exclusivity is validated per-file above, but re-check the batch:
    // one video must ride alone.
    const batchKinds = picked.map(kindOfFile);
    if (
      batchKinds.includes("video") &&
      (items.length > 0 || picked.length > 1)
    ) {
      setError("Video can't be combined with other media");
      return;
    }

    setError("");
    for (const file of picked) {
      const kind = kindOfFile(file);
      if (kind === "video") {
        // Check duration before accepting — 60s cap keeps uploads + feed fast.
        const id = `v-${Date.now()}-${itemSeq++}`;
        setItems((prev) => [
          ...prev,
          {
            id,
            file,
            previewUrl: URL.createObjectURL(file),
            kind,
            probing: true,
          },
        ]);
        try {
          const meta = await getVideoMetadata(file);
          if (meta.duration > MEDIA_LIMITS.VIDEO_MAX_DURATION_S + 2) {
            setItems((prev) => {
              const it = prev.find((x) => x.id === id);
              if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
              return prev.filter((x) => x.id !== id);
            });
            setError("Video must be 60 seconds or less");
            return;
          }
          // Pre-generate the poster now so submit is instant and the feed
          // gets an image-weight placeholder (no backend transcoding).
          let posterBlob = null;
          try {
            const gen = await generateVideoPoster(file);
            posterBlob = gen.blob || null;
            setItems((prev) =>
              prev.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      probing: false,
                      width: gen.width,
                      height: gen.height,
                      duration: gen.duration || meta.duration,
                      posterBlob,
                    }
                  : x,
              ),
            );
          } catch {
            setItems((prev) =>
              prev.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      probing: false,
                      width: meta.width,
                      height: meta.height,
                      duration: meta.duration,
                    }
                  : x,
              ),
            );
          }
          kinds.push("video");
        } catch {
          setItems((prev) => prev.filter((x) => x.id !== id));
          setError("Couldn't read that video");
          return;
        }
      } else {
        const id = `i-${Date.now()}-${itemSeq++}`;
        setItems((prev) => [
          ...prev,
          { id, file, previewUrl: URL.createObjectURL(file), kind },
        ]);
        kinds.push(kind);
      }
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    if (pollOpen && !pollValid) {
      setError("Add at least 2 poll options (max 80 chars each)");
      return;
    }
    if (items.some((it) => it.probing)) {
      setError("Still reading your video — try again in a second");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const poll = pollValid
        ? { options: cleanOptions, durationDays: pollDays }
        : undefined;
      const files = items.map((it) => it.file);
      const posters = items.map((it) => it.posterBlob || null);
      const meta = items.map((it) => ({
        width: it.width || undefined,
        height: it.height || undefined,
        duration: it.duration || undefined,
      }));
      const hasMeta = meta.some((m) => m.width || m.height || m.duration);
      const res = await api.createPost(
        text.trim() || undefined,
        files.length ? files : undefined,
        poll,
        files.length ? { posters, meta: hasMeta ? meta : undefined } : {},
      );
      setText("");
      clearItems();
      resetPoll();
      try {
        window.localStorage.removeItem(draftKey);
      } catch {}
      window.dispatchEvent(new Event("cz:hashtag-trending"));
      onCreated?.(res.data?.post);
      // Keep focus in the box so rapid post → post stays keyboard-first.
      requestAnimationFrame(() => textRef.current?.focus());
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
        <span className={withAvatarRing(user, "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
          {user?.avatarUrl ? (
            <CzImage
              src={user.avatarUrl}
              alt={user?.username}
              className="h-full w-full rounded-full"
              imgClassName="h-full w-full"
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
                // Cmd/Ctrl+Enter posts from anywhere in the box.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              onBlur={() => setTimeout(() => mention.close(), 150)}
              placeholder="What's happening?"
              aria-label="Post text"
              rows={2}
              maxLength={520}
              className="max-h-[200px] min-h-[56px] w-full resize-none overflow-y-auto bg-transparent pb-2 text-[20px] leading-[24px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
            />
            <MentionSuggest
              open={mention.open}
              users={mention.users}
              active={mention.active}
              onSelect={mention.insert}
              onHover={mention.setActive}
            />
          </div>

          {items.length ? (
            <div
              className={cn(
                "mt-2 grid gap-1 overflow-hidden rounded-[16px] border border-[var(--cz-border)]",
                items.length > 1 && "grid-cols-2",
              )}
            >
              {items.map((it) => (
                <div
                  key={it.id}
                  className="relative overflow-hidden bg-black/5"
                >
                  {it.kind === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={it.previewUrl}
                      preload="metadata"
                      playsInline
                      muted
                      className="max-h-[300px] w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.previewUrl}
                      alt={`${it.kind} attachment preview`}
                      className="max-h-[300px] w-full object-cover"
                    />
                  )}
                  {it.kind === "gif" ? (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                      GIF
                    </span>
                  ) : null}
                  {it.kind === "video" && it.duration ? (
                    <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[12px] font-bold text-white tabular-nums">
                      {formatDuration(it.duration)}
                    </span>
                  ) : null}
                  {it.probing ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/30">
                      <Loader2
                        className="h-5 w-5 animate-spin text-white"
                        aria-hidden
                      />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {pollOpen ? (
            <div className="mt-2 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
              <div className="flex items-center justify-between border-b border-[var(--cz-border)] px-3 py-2">
                <span className="text-[14px] font-bold text-[var(--cz-text-primary)]">
                  Poll
                </span>
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
                          setPollOptions((prev) =>
                            prev.map((p, j) => (j === i ? e.target.value : p)),
                          )
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
                        onClick={() =>
                          setPollOptions((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
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
            <p role="alert" className="mt-2 text-[13px] text-[var(--cz-error)]">{error}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pollOpen || items.length >= MEDIA_LIMITS.MAX_FILES}
                aria-label="Add photos, GIF or video"
                title="Photos, GIFs, video (25MB / 60s). Tip: Cmd+Enter to post"
                className="grid h-[44px] w-[44px] place-items-center rounded-full text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {items.some((it) => it.kind === "video") ? (
                  <Film
                    className="h-[20px] w-[20px]"
                    strokeWidth={1.9}
                    aria-hidden
                  />
                ) : (
                  <ImageIcon
                    className="h-[20px] w-[20px]"
                    strokeWidth={1.9}
                    aria-hidden
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPollOpen((v) => !v);
                  setError("");
                }}
                disabled={items.length > 0}
                aria-label={pollOpen ? "Remove poll" : "Add poll"}
                aria-pressed={pollOpen}
                className={cn(
                  "grid h-[44px] w-[44px] place-items-center rounded-full transition-colors",
                  pollOpen
                    ? "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                    : "text-[var(--cz-accent)] hover:bg-[var(--cz-accent-soft)]",
                  items.length > 0 && "opacity-40 hover:bg-transparent",
                )}
              >
                <BarChart2
                  className="h-[20px] w-[20px]"
                  strokeWidth={1.9}
                  aria-hidden
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_POST_MEDIA}
                multiple
                onChange={handleFilesSelect}
                className="hidden"
              />
              <span
                className={cn(
                  "text-[13px] tabular-nums",
                  over
                    ? "text-[var(--cz-error)]"
                    : remaining <= 40
                      ? "text-[var(--cz-warn)]"
                      : "text-[var(--cz-text-secondary)]",
                )}
                aria-live="polite"
                aria-label={`${remaining} characters remaining`}
              >
                {len}/{MAX}
              </span>
              {items.length ? (
                <span className="hidden text-[13px] text-[var(--cz-text-secondary)] sm:inline">
                  {items.length}/{MEDIA_LIMITS.MAX_FILES}
                </span>
              ) : null}
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
