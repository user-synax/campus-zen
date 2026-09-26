"use client";

import Link from "next/link";
import { Fragment } from "react";

const HASHTAG_SPLIT_REGEX = /(#[\p{L}\p{M}\p{N}_]+)/gu;

export function extractTagsForRender(text) {
  if (!text) return [];
  const matches = text.match(HASHTAG_SPLIT_REGEX) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export function HashtagText({ text, className = "" }) {
  if (!text) return null;
  const parts = text.split(HASHTAG_SPLIT_REGEX);
  if (parts.length === 1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const isTag = part.startsWith("#") && part.length > 1;
        if (isTag) {
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
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
