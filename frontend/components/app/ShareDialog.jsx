"use client";

import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  Ghost,
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  Repeat2,
  Send,
  ThumbsUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CzImage } from "@/components/app/CzImage";
import { useAnimatedMount } from "@/components/app/useAnimatedMount";
import { BrandMark } from "@/components/BrandLogo";
import {
  InstagramBrandIcon,
  LinkedInBrandIcon,
  WhatsAppBrandIcon,
  XBrandIcon,
} from "@/components/share/SocialIcons";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/ui/verified-badge";
import {
  SHARE_BRAND,
  shareAbsoluteUrl,
  shareAuthor,
  shareCaption,
  shareHeadline,
  shareMedia,
  sharePostText,
  truncateShareText,
  tweetText,
} from "@/lib/share";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  {
    id: "x",
    label: "X",
    blurb: "Post with a native link card",
    action: "Share on X",
    accentIcon: XBrandIcon,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    blurb: "Share to your professional feed",
    action: "Share on LinkedIn",
    accentIcon: LinkedInBrandIcon,
  },
  {
    id: "instagram",
    label: "Instagram Story",
    blurb: "A branded 9:16 story graphic",
    action: "Share story",
    accentIcon: InstagramBrandIcon,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    blurb: "Send the card in a chat",
    action: "Send on WhatsApp",
    accentIcon: WhatsAppBrandIcon,
  },
];

const HINTS = {
  x: "X opens with your caption filled in. The link unfurls into the branded CampusZen card.",
  linkedin:
    "LinkedIn shares the link and pulls the branded preview automatically. The card is 1200 × 630.",
  instagram:
    "Stories have no web share intent. Download the 1080 × 1920 image, or use your device's share sheet if it supports files.",
  whatsapp:
    "WhatsApp shows the CampusZen link card before you hit send. The image is 1200 × 630.",
};

function copyToClipboard(value) {
  return (async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {}
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  })();
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

function PreviewAvatar({ user, size = 40 }) {
  const initial = (user?.name || "C").trim().charAt(0).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#d1d5db] text-[#374151]"
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.32) }}
    >
      {user?.avatarUrl && !user?.isAnonymous ? (
        <CzImage
          src={user.avatarUrl}
          alt=""
          className="h-full w-full"
          imgClassName="h-full w-full object-cover"
        />
      ) : user?.isAnonymous ? (
        <Ghost style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden />
      ) : (
        initial
      )}
    </span>
  );
}

/** The branded artwork behind every platform preview. */
function LinkCardArt({ post, author, media, quote, className }) {
  const isArticle = post.kind === "article";
  const kicker = isArticle
    ? "Article"
    : author.isAnonymous
      ? "Anonymous"
      : "Post";
  const articleExcerpt = isArticle ? sharePostText(post, 150) : "";
  return (
    <div
      className={cn(
        "relative isolate aspect-[1.91/1] w-full overflow-hidden bg-[#071018] text-white",
        className,
      )}
    >
      {media ? (
        <CzImage
          src={media.url}
          alt=""
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full w-full object-cover opacity-45"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,12,18,0.97),rgba(8,26,38,0.86)_55%,rgba(4,12,18,0.97))]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#1d9bf0]/25 blur-2xl"
      />
      <div className="relative flex h-full flex-col justify-between p-2.5 sm:p-3">
        <div className="flex items-center gap-1.5">
          <BrandMark size={17} />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[11px] font-extrabold tracking-[-0.02em] text-white">
              CampusZen
            </span>
            <span className="mt-[3px] truncate text-[7px] font-medium text-white/50">
              Open source social media for students.
            </span>
          </span>
          <span className="ml-auto shrink-0 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-white/60">
            {kicker}
          </span>
        </div>
        {isArticle ? (
          <div className="min-w-0">
            <p className="line-clamp-2 text-[12px] font-extrabold leading-[15px] tracking-[-0.01em] text-white sm:text-[13px] sm:leading-[16px]">
              {post.title || "Article on CampusZen"}
            </p>
            {articleExcerpt ? (
              <p className="mt-0.5 line-clamp-2 text-[8px] leading-[10px] text-white/60">
                {articleExcerpt}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="line-clamp-3 text-[12px] font-bold leading-[15px] tracking-[-0.01em] text-white sm:text-[13px] sm:leading-[16px]">
            “{quote}”
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-[8px] font-medium text-white/55">
          <span className="truncate">
            {author.isAnonymous ? "Anonymous" : `@${author.handle}`}
          </span>
          <span className="shrink-0">{SHARE_BRAND.domain}</span>
        </div>
      </div>
    </div>
  );
}

function XPreview({ post, author, media, caption, headline, quote }) {
  return (
    <div className="w-full max-w-[400px] rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3.5 text-[var(--cz-text-primary)] shadow-[var(--shadow-sm)] sm:p-4">
      <div className="flex items-start gap-2.5">
        <PreviewAvatar user={author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 leading-[18px]">
            <span className="truncate text-[14px] font-bold">
              {author.name}
            </span>
            {author.isAnonymous ? (
              <span className="shrink-0 rounded-full bg-[var(--cz-surface-strong)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-[var(--cz-text-secondary)]">
                ANON
              </span>
            ) : (
              <UserBadge user={post.author} size="sm" />
            )}
            <span className="truncate text-[14px] text-[var(--cz-text-secondary)]">
              @{author.handle}
            </span>
          </div>
          <p className="text-[12px] text-[var(--cz-text-secondary)]">now</p>
        </div>
        <XBrandIcon className="mt-0.5 h-[19px] w-[19px] shrink-0 text-[var(--cz-text-primary)]" />
      </div>

      <p className="mt-2.5 line-clamp-5 whitespace-pre-wrap break-words text-[14px] leading-[19px]">
        {caption}
      </p>

      <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--cz-border-strong)]">
        <LinkCardArt
          post={post}
          author={author}
          media={media}
          quote={quote}
          className="rounded-none"
        />
        <div className="bg-[var(--cz-surface)] px-2.5 py-2">
          <p className="line-clamp-1 text-[13px] font-semibold leading-[17px]">
            {headline}
          </p>
          <p className="mt-0.5 text-[11px] leading-[15px] text-[var(--cz-text-secondary)]">
            From {SHARE_BRAND.domain}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--cz-border)] pt-2.5 text-[var(--cz-text-secondary)]">
        <span className="flex items-center gap-4 sm:gap-5">
          <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.8} />
          <Repeat2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
          <Heart className="h-[15px] w-[15px]" strokeWidth={1.8} />
          <Bookmark className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </span>
        <span className="text-[10px] font-medium">x.com</span>
      </div>
    </div>
  );
}

function LinkedInPreview({ author, media, post, caption, headline, quote }) {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[10px] border border-[#e0e0e0] bg-white text-[#1f1f1f] shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5">
        <PreviewAvatar user={author} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-[18px]">
            {author.name}
          </p>
          <p className="truncate text-[11px] leading-[15px] text-[#666]">
            {author.isAnonymous
              ? "Anonymous post"
              : `@${author.handle} · CampusZen`}
          </p>
          <p className="text-[11px] leading-[15px] text-[#666]">
            Just now · <span aria-hidden>🌐</span>
          </p>
        </div>
        <LinkedInBrandIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#0a66c2]" />
      </div>

      <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words px-3.5 text-[13px] leading-[18px]">
        {caption}
      </p>

      <div className="mt-2.5 border-y border-[#e8e8e8]">
        <LinkCardArt
          post={post}
          author={author}
          media={media}
          quote={quote}
          className="rounded-none"
        />
        <div className="px-3.5 py-2">
          <p className="line-clamp-1 text-[13px] font-semibold leading-[18px]">
            {headline}
          </p>
          <p className="text-[11px] leading-[15px] text-[#666]">
            {SHARE_BRAND.domain}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-[#5c5c5c]">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.8} /> Like
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} /> Comment
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat2 className="h-3.5 w-3.5" strokeWidth={1.8} /> Repost
        </span>
        <span className="inline-flex items-center gap-1">
          <Send className="h-3.5 w-3.5" strokeWidth={1.8} /> Send
        </span>
      </div>
    </div>
  );
}

function InstagramStoryPreview({ viewer, author, media, post, quote }) {
  const storyUser = viewer
    ? {
        name:
          viewer.fullName ||
          viewer.name ||
          viewer.username ||
          viewer.handle ||
          "Your story",
        handle: viewer.username || viewer.handle || "you",
        avatarUrl: viewer.avatarUrl || null,
      }
    : {
        name: "Your story",
        handle: "you",
        avatarUrl: null,
      };
  return (
    <div
      className="relative w-auto shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      style={{
        height: "min(52vh, 430px)",
        minHeight: 330,
        aspectRatio: "9 / 16",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(150deg,#060c12,#0b1b26_55%,#060c12)]"
      />
      <div
        aria-hidden
        className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#1d9bf0]/25 blur-2xl"
      />

      <div className="relative flex h-full flex-col px-2 pb-2 pt-1.5">
        <div className="flex items-center justify-between px-1 text-[7px] font-semibold text-white/90">
          <span>9:41</span>
          <span className="flex items-center gap-1" aria-hidden>
            <span>▮▮▮</span>
            <span>◔</span>
            <span>▰</span>
          </span>
        </div>

        <div className="mt-1.5 flex gap-1 px-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                "h-[2px] flex-1 rounded-full",
                index === 0 ? "bg-white" : "bg-white/30",
              )}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5 px-1">
          <span className="rounded-full bg-[linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)] p-[1.5px]">
            <PreviewAvatar user={storyUser} size={18} />
          </span>
          <span className="text-[8px] font-bold text-white">
            {viewer ? `@${storyUser.handle}` : "Your story"}
          </span>
          <span className="text-[7px] text-white/55">now</span>
          <X className="ml-auto h-3 w-3 text-white/85" strokeWidth={2.2} />
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col justify-between rounded-[13px] border border-white/10 bg-[linear-gradient(140deg,#060c12,#0b1b26_55%,#060c12)] p-2.5 text-white">
          <div className="flex items-center gap-1.5">
            <BrandMark size={15} />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[9px] font-extrabold tracking-[-0.02em]">
                CampusZen
              </span>
              <span className="mt-[2px] text-[5px] font-medium text-white/45">
                Open source social media for students.
              </span>
            </span>
            <span className="ml-auto rounded-full border border-white/15 px-1.5 py-0.5 text-[5px] font-bold uppercase tracking-[0.12em] text-white/55">
              {post.kind === "article" ? "Article" : "Post"}
            </span>
          </div>

          {post.kind === "article" ? (
            <div className="mt-2 min-w-0">
              <p className="line-clamp-4 text-[14px] font-extrabold leading-[17px] tracking-[-0.02em]">
                {post.title || "Article on CampusZen"}
              </p>
              <p className="mt-1 line-clamp-3 text-[8px] leading-[10px] text-white/60">
                {sharePostText(post, 150)}
              </p>
            </div>
          ) : (
            <p className="mt-2 line-clamp-6 text-[14px] font-extrabold leading-[17px] tracking-[-0.02em]">
              “{quote}”
            </p>
          )}

          {media ? (
            <CzImage
              src={media.url}
              alt=""
              className="mt-2 h-[70px] w-full shrink-0 overflow-hidden rounded-[7px]"
              imgClassName="h-full w-full object-cover"
            />
          ) : null}

          <div className="mt-2 flex items-center gap-1.5">
            <PreviewAvatar user={author} size={14} />
            <span className="truncate text-[7px] font-bold">{author.name}</span>
            <span className="truncate text-[6px] text-white/50">
              @{author.handle}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1">
            <span className="rounded-full bg-[#1d9bf0] px-2 py-1 text-[7px] font-bold text-white">
              Read the full post
            </span>
            <span className="text-[6px] text-white/45">
              {SHARE_BRAND.domain}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-2 h-[2px] w-10 rounded-full bg-white/45" />
      </div>
    </div>
  );
}

function WhatsAppPreview({ author, media, post, caption, headline, quote }) {
  return (
    <div className="w-full max-w-[390px] overflow-hidden rounded-[14px] border border-black/10 bg-[#efeae2] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 bg-[#008069] px-3 py-2 text-white">
        <span className="text-[16px] leading-none" aria-hidden>
          ‹
        </span>
        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/15">
          <BrandMark size={28} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-semibold">CampusZen</span>
          <span className="text-[9px] text-white/75">online</span>
        </span>
        <span
          className="flex items-center gap-2 text-[11px] text-white/85"
          aria-hidden
        >
          <span>▷</span>
          <span>⋮</span>
        </span>
      </div>

      <div
        className="relative min-h-[260px] px-2.5 py-3"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(70,54,35,0.055) 1px, transparent 1.2px), radial-gradient(circle at 70% 60%, rgba(70,54,35,0.045) 1px, transparent 1.2px)",
          backgroundSize: "20px 20px, 28px 28px",
        }}
      >
        <div className="mx-auto mb-2 w-fit rounded-[5px] bg-[#e1f3fb] px-2 py-0.5 text-[8px] font-medium text-[#54656f] shadow-sm">
          TODAY
        </div>

        <div className="ml-auto max-w-[88%] rounded-[8px] rounded-tr-[2px] bg-[#d9fdd3] p-1.5 shadow-sm">
          <p className="line-clamp-3 whitespace-pre-wrap break-words px-1 pt-0.5 text-[12px] leading-[16px] text-[#111b21]">
            {caption}
          </p>

          <div className="mt-1 overflow-hidden rounded-[6px] bg-white">
            <LinkCardArt
              post={post}
              author={author}
              media={media}
              quote={quote}
              className="rounded-none"
            />
            <div className="px-2 py-1.5">
              <p className="line-clamp-1 text-[11px] font-semibold leading-[15px] text-[#111b21]">
                {headline}
              </p>
              <p className="text-[9px] leading-[12px] text-[#667781]">
                {SHARE_BRAND.domain}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 px-1 pt-1 text-[8px] text-[#667781]">
            <span>12:30</span>
            <span className="tracking-[-3px] text-[#53bdeb]">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShareDialog({ open, post, viewer, onClose }) {
  const { show, mountClass } = useAnimatedMount(open);
  const dialogRef = useRef(null);
  const flashTimer = useRef(null);
  const onCloseRef = useRef(onClose);
  const [platform, setPlatform] = useState("x");
  const [busy, setBusy] = useState(null);
  const [flash, setFlash] = useState(null);
  const [nativeFileShare, setNativeFileShare] = useState(false);
  const [origin, setOrigin] = useState(SHARE_BRAND.url);

  const author = useMemo(() => shareAuthor(post), [post]);
  const media = useMemo(() => shareMedia(post), [post]);
  const url = useMemo(
    () => (post ? shareAbsoluteUrl(post, origin) : SHARE_BRAND.url),
    [post, origin],
  );
  const caption = useMemo(() => (post ? shareCaption(post, 240) : ""), [post]);
  const tweet = useMemo(() => (post ? tweetText(post, 200) : ""), [post]);
  // Match the actual og:title so the in-app card mirrors what the platform
  // will unfurl, not a different in-app headline.
  const headline = useMemo(() => shareHeadline(post), [post]);
  const cardQuote = useMemo(
    () => (post ? sharePostText(post, 135) : ""),
    [post],
  );
  const storyQuote = useMemo(
    () => (post ? sharePostText(post, 220) : ""),
    [post],
  );

  const activePlatform =
    PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
  const isStory = platform === "instagram";
  const format = isStory ? "story" : "card";
  const dimensions = isStory ? "1080 × 1920" : "1200 × 630";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setOrigin(window.location.origin);
    const onKey = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const probe = new File(
        [new Blob(["probe"], { type: "image/png" })],
        "probe.png",
        {
          type: "image/png",
        },
      );
      setNativeFileShare(
        typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [probe] }),
      );
    } catch {
      setNativeFileShare(false);
    }
  }, [open]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  if (!show || !post || !author) return null;

  const flashFor = (key) => {
    setFlash(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1800);
  };

  const copy = async (value, key, message) => {
    const ok = await copyToClipboard(value);
    if (!ok) {
      toast.error("Couldn't copy. Try again.");
      return;
    }
    flashFor(key);
    toast.success(message);
  };

  const fetchShareImage = async () => {
    const res = await fetch(`/app/p/${post._id}/share-image?format=${format}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Image generation failed");
    return res.blob();
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy("download");
    try {
      const blob = await fetchShareImage();
      downloadBlob(blob, `campuszen-${format}-${post._id}.png`);
      toast.success(isStory ? "Story image saved" : "Card image saved");
    } catch {
      toast.error("Couldn't generate the image. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const openIntent = (href, message) => {
    window.open(href, "_blank", "noopener,noreferrer");
    if (message) toast.success(message);
  };

  const handlePrimary = async () => {
    if (platform === "x") {
      const href = `https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`;
      openIntent(href, "Opening X…");
      return;
    }
    if (platform === "linkedin") {
      const href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      openIntent(href, "Opening LinkedIn…");
      return;
    }
    if (platform === "whatsapp") {
      const text = `${caption}\n\n${url}`;
      openIntent(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "Opening WhatsApp…",
      );
      return;
    }

    if (platform === "instagram" && !nativeFileShare) {
      await handleDownload();
      return;
    }

    if (busy) return;
    setBusy("primary");
    let blob = null;
    try {
      blob = await fetchShareImage();
      const file = new File([blob], `campuszen-story-${post._id}.png`, {
        type: "image/png",
      });
      if (!navigator.canShare?.({ files: [file] })) {
        throw new Error("File sharing unavailable");
      }
      await navigator.share({ files: [file], text: caption });
      toast.success("Story shared");
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (blob) {
        downloadBlob(blob, `campuszen-story-${post._id}.png`);
        toast.success("Share sheet unavailable — story image saved");
      } else {
        toast.error("Couldn't generate the story image. Try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  const primaryLabel =
    platform === "instagram" && !nativeFileShare
      ? "Download story image"
      : activePlatform.action;
  const PrimaryIcon = activePlatform.accentIcon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
    >
      <button
        type="button"
        aria-label="Close share dialog"
        onClick={onClose}
        className={`t-backdrop ${mountClass} absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] backdrop-blur-[2px]`}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`t-modal ${mountClass} relative flex max-h-[92dvh] w-full min-w-0 max-w-[980px] flex-col overflow-hidden rounded-t-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] shadow-[var(--shadow-sm)] outline-none sm:rounded-[16px]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--cz-border)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2
              id="share-dialog-title"
              className="text-[20px] font-extrabold leading-6 text-[var(--cz-text-primary)]"
            >
              Share to socials
            </h2>
            <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              Platform-perfect previews with CampusZen branding baked in.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Share destination"
          className="flex w-full min-w-0 shrink-0 gap-2 overflow-x-auto border-b border-[var(--cz-border)] px-4 py-2.5 [scrollbar-width:none] sm:px-5"
        >
          {PLATFORMS.map((item) => {
            const Icon = item.accentIcon;
            const active = platform === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="share-preview-panel"
                onClick={() => setPlatform(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors",
                  active
                    ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                    : "border-[var(--cz-border-strong)] bg-transparent text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <div
            id="share-preview-panel"
            role="tabpanel"
            aria-label={`${activePlatform.label} preview`}
            className="grid min-w-0 flex-1 place-items-center overflow-y-auto bg-[var(--cz-surface-strong)] p-4 sm:p-6 md:min-h-0"
          >
            {platform === "x" ? (
              <XPreview
                post={post}
                author={author}
                media={media}
                caption={tweet}
                headline={headline}
                quote={cardQuote}
              />
            ) : platform === "linkedin" ? (
              <LinkedInPreview
                post={post}
                author={author}
                media={media}
                caption={truncateShareText(caption, 200)}
                headline={headline}
                quote={cardQuote}
              />
            ) : platform === "instagram" ? (
              <InstagramStoryPreview
                viewer={viewer}
                author={author}
                media={media}
                post={post}
                quote={storyQuote}
              />
            ) : (
              <WhatsAppPreview
                post={post}
                author={author}
                media={media}
                caption={truncateShareText(caption, 170)}
                headline={headline}
                quote={cardQuote}
              />
            )}
          </div>

          <aside className="w-full shrink-0 border-t border-[var(--cz-border)] p-4 sm:p-5 md:w-[318px] md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface-strong)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cz-text-secondary)]">
                  Shareable link
                </p>
                <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--cz-text-primary)]">
                  {url.replace(/^https?:\/\//, "")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy(url, "link", "Link copied")}
                aria-label="Copy link"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface)] hover:text-[var(--cz-accent)]"
              >
                {flash === "link" ? (
                  <Check
                    className="h-4 w-4 text-[var(--cz-accent)]"
                    aria-hidden
                  />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            <Button
              type="button"
              onClick={handlePrimary}
              disabled={busy === "primary"}
              className="mt-3 w-full"
            >
              {busy === "primary" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <PrimaryIcon className="h-4 w-4" />
              )}
              {primaryLabel}
            </Button>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={Boolean(busy)}
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--cz-border-strong)] px-1.5 py-2 text-[11px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
              >
                {busy === "download" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4" aria-hidden />
                )}
                {isStory ? "Story" : "Card"}
              </button>
              <button
                type="button"
                onClick={() => copy(url, "link", "Link copied")}
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--cz-border-strong)] px-1.5 py-2 text-[11px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
              >
                {flash === "link" ? (
                  <Check
                    className="h-4 w-4 text-[var(--cz-accent)]"
                    aria-hidden
                  />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                Link
              </button>
              <button
                type="button"
                onClick={() => copy(caption, "caption", "Caption copied")}
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--cz-border-strong)] px-1.5 py-2 text-[11px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
              >
                {flash === "caption" ? (
                  <Check
                    className="h-4 w-4 text-[var(--cz-accent)]"
                    aria-hidden
                  />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                Caption
              </button>
            </div>

            <p className="mt-3 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              {HINTS[platform]}
            </p>

            {platform === "instagram" && !nativeFileShare ? (
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--cz-accent)] hover:underline"
              >
                Open Instagram <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}

            <p className="mt-4 border-t border-[var(--cz-border)] pt-3 text-[11px] leading-[15px] text-[var(--cz-text-tertiary)]">
              Download is a {dimensions} PNG. Link cards are generated per post,
              so the preview stays branded on every platform.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
