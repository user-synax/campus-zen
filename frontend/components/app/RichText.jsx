"use client";

import Link from "next/link";
import { Fragment } from "react";

// combined splitter: hashtags + mentions in one pass, preserving order
const RICH_SPLIT_REGEX = /(#[\p{L}\p{M}\p{N}_]+|(?<!\w)@[a-z0-9_]{3,20}\b)/giu;

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

export function RichText({ text, className = "" }) {
  if (!text) return null;
  const parts = text.split(RICH_SPLIT_REGEX);
  if (parts.length === 1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("#") && part.length > 1) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/app/tag/${encodeURIComponent(tag)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--cz-muted)] hover:text-[var(--cz-text-primary)] hover:underline underline-offset-4 font-medium"
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
              className="text-[var(--cz-muted)] hover:text-[var(--cz-text-primary)] hover:underline underline-offset-4 font-medium"
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
