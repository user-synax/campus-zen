"use client";

// Backwards-compat wrapper — new code should import { RichText } from "./RichText".
// Kept so existing imports of HashtagText keep rendering both #tags and @mentions.
export { RichText as HashtagText, extractTagsForRender } from "./RichText";
