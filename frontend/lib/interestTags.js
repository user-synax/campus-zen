import {
  Briefcase,
  Code2,
  Palette,
  PenLine,
  Server,
  ShieldCheck,
} from "lucide-react";

/**
 * Interest-tag taxonomy (v1, fixed) — mirrors the backend constant
 * (backend/src/utils/interestTags.js). IDs are lowercase slugs; the hub feed,
 * the composer picker and the card chips all render from this single source.
 */

export const MAX_INTEREST_TAGS = 3;

/**
 * Per-topic chip tones: light background + dark icon + colored text in light
 * theme; the same hue in a translucent-capable form for dark mode (Tailwind
 * class-based dark via the `dark` html class).
 */
const TONES = {
  coding:
    "text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-500/15 border-sky-300/60 dark:border-sky-400/25",
  design:
    "text-violet-700 dark:text-violet-300 bg-violet-100/80 dark:bg-violet-500/15 border-violet-300/60 dark:border-violet-400/25",
  cybersecurity:
    "text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/15 border-emerald-300/60 dark:border-emerald-400/25",
  devops:
    "text-cyan-700 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-500/15 border-cyan-300/60 dark:border-cyan-400/25",
  drawing:
    "text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-500/15 border-rose-300/60 dark:border-rose-400/25",
  business:
    "text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/15 border-amber-300/60 dark:border-amber-400/25",
};

export const INTEREST_TAGS = [
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "design", label: "Design", icon: Palette },
  {
    id: "cybersecurity",
    label: "Cyber",
    icon: ShieldCheck,
    fullLabel: "Cybersecurity",
  },
  { id: "devops", label: "DevOps", icon: Server },
  { id: "drawing", label: "Drawing", icon: PenLine },
  { id: "business", label: "Business", icon: Briefcase },
].map((t) => ({ ...t, tone: TONES[t.id] }));

export const INTEREST_TAG_IDS = INTEREST_TAGS.map((t) => t.id);

const INTEREST_TAG_MAP = new Map(INTEREST_TAGS.map((t) => [t.id, t]));

export function interestTag(id) {
  return INTEREST_TAG_MAP.get(String(id || "").toLowerCase()) || null;
}

/** Route to the Interest Hub page (?tag= hydrates the initial topic). */
export const HUB_PATH = "/app/hub";
