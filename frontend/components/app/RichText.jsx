"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ArticleMentionCard } from "@/components/app/ArticleMentionCard";
import { extractArticleMentionsForRender } from "@/lib/articles";

// combined splitter: article-mentions + urls + hashtags + mentions in one pass.
// Article-first so ${user/slug} never splits into fragments.
// - https?://... , www.... , bare campuszen.tech / something.vercel.app
// - bare domains need a dot + 2+ letter TLD, blocked after @/:. so emails
//   like test@gmail.com never linkify.
const RICH_SPLIT_REGEX =
  /(\$\{[a-z0-9_]{3,20}\/[a-z0-9-]{1,100}\}|https?:\/\/[^\s<>()\[\]{}"']+|www\.[^\s<>()\[\]{}"']+|(?<![\w@/:.])(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<>()\[\]{}"']*)?|#[\p{L}\p{M}\p{N}_]+|(?<!\w)@[a-z0-9_]{3,20}\b)/giu;

const ARTICLE_REF_RE = /^\$\{([a-z0-9_]{3,20})\/([a-z0-9-]{1,100})\}$/i;

export function extractTagsForRender(text) {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{M}\p{N}_]+/gu) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export function extractMentionsForRender(text) {
  if (!text) return [];
  const matches = text.match(/(?<!\w)@[a-z0-9_]{3,20}\b/gi) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export function extractArticleMentions(text) {
  return extractArticleMentionsForRender(text);
}

// DESIGN.md: "Use #1d9bf0 exclusively for actionable elements: ... links".
// X Blue, no weight change, no hover underline flip.
const linkClass = "text-[var(--cz-accent)] hover:underline underline-offset-2";

const BARE_DOMAIN_RE =
  /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<>()\[\]{}"']*)?$/i;

function isUrlLike(part) {
  if (!part) return false;
  if (/^https?:\/\//i.test(part)) return true;
  if (/^www\./i.test(part)) return true;
  return BARE_DOMAIN_RE.test(part);
}

function splitTrailingPunct(url) {
  const m = url.match(/[.,!?;:'")\]}>]+$/);
  if (!m) return [url, ""];
  return [url.slice(0, -m[0].length), m[0]];
}

function normalizeUrl(core) {
  if (!core) return null;
  if (/^https?:\/\//i.test(core)) return core;
  return `https://${core}`;
}

export function RichText({ text, className = "", articleCompact = false }) {
  if (!text) return null;
  const parts = text.split(RICH_SPLIT_REGEX);
  if (parts.length === 1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const am = part.match(ARTICLE_REF_RE);
        if (am) {
          const username = am[1].toLowerCase();
          const slug = am[2].toLowerCase();
          return (
            <span key={i} className="block" onClick={(e) => e.stopPropagation()}>
              <ArticleMentionCard username={username} slug={slug} compact={articleCompact} />
            </span>
          );
        }
        // URLs first — keeps #fragments and @ in paths inside the link.
        if (isUrlLike(part)) {
          const [core, trail] = splitTrailingPunct(part);
          const href = normalizeUrl(core);
          if (!href || !isUrlLike(core)) return <Fragment key={i}>{part}</Fragment>;
          return (
            <Fragment key={i}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => e.stopPropagation()}
                className={linkClass}
              >
                {core}
              </a>
              {trail}
            </Fragment>
          );
        }
        if (part.startsWith("#") && part.length > 1) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/app/tag/${encodeURIComponent(tag)}`}
              onClick={(e) => e.stopPropagation()}
              className={linkClass}
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/u/${encodeURIComponent(username)}`}
              onClick={(e) => e.stopPropagation()}
              className={linkClass}
            >
              {part}
            </Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
