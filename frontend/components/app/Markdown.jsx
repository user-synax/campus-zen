"use client";

import { useMemo } from "react";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

function sanitizeHtml(html) {
  if (!html) return "";
  let out = String(html);
  out = out.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, "");
  out = out.replace(/<(object|embed|form|style|link|meta)[\s\S]*?(?:<\/\1\s*>|>)/gi, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*(")/gi, '$1="#"');
  out = out.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');
  return out;
}

export function renderMarkdownToHtml(md) {
  const raw = marked.parse(String(md || ""), { breaks: true, gfm: true });
  return sanitizeHtml(raw);
}

export function Markdown({ body, className = "" }) {
  const html = useMemo(() => renderMarkdownToHtml(body), [body]);
  if (!body) return null;
  return (
    <div
      className={`cz-markdown ${className}`}
      // Sanitized via sanitizeHtml above (scripts/iframes/handlers stripped).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
