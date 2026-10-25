"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { HUB_PATH, INTEREST_TAGS, interestTag } from "@/lib/interestTags";
import { cn } from "@/lib/utils";

/**
 * Interest-tag chips — the single presentation piece used by the composer
 * picker, the hub strip and cards. Tones (light bg + dark icon + colored
 * text) live on each tag entry in `lib/interestTags.js` and carry explicit
 * dark-theme variants.
 */

const chipBase =
  "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform,box-shadow] active:scale-[0.96]";
const chipTap = "h-[32px] px-2.5 text-[13px]";
const chipCard = "h-[24px] px-2 text-[12px]";
// active = crisp inner ring in the tag's own text color
const chipActive = "shadow-[inset_0_0_0_1.5px_currentColor]";
const chipDisabled = "opacity-40";
const cursorHover = "hover:cursor-pointer"

function ChipInner({ tag, active, condensed }) {
  const Icon = tag.icon;
  return (
    <>
      <Icon className={condensed ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {active ? <Check className="h-3 w-3" aria-hidden /> : null}
      {tag.label}
    </>
  );
}

/**
 * Pick/toggle chip for the composer. `disabled` greys an unselected chip out
 * once the max is reached; stays focusable with aria-disabled so the reason
 * is discoverable.
 */
export function InterestTagPick({ tag, active, disabled, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={disabled && !active}
      disabled={disabled && !active}
      onClick={onToggle}
      className={cn(
        chipBase,
        chipTap,
        cursorHover,
        tag.tone,
        active && chipActive,
        disabled && !active && chipDisabled,
      )}
    >
      <ChipInner tag={tag} active={active} />
    </button>
  );
}

/** All six tags as instant-toggle buttons — the composer's topic picker. */
export function InterestTagPicker({ selected, max = 3, onToggle }) {
  return (
    <fieldset
      aria-label="Post topics — optional, pick up to 3"
      className="flex flex-wrap  gap-1.5"
    >
      {INTEREST_TAGS.map((tag) => (
        <InterestTagPick
          key={tag.id}
          tag={tag}
          active={selected.includes(tag.id)}
          disabled={selected.length >= max}
          onToggle={() => onToggle(tag.id)}
        />
      ))}
    </fieldset>
  );
}

/** Hub topic strip — on the hub page each chip is a link swapping ?tag= so
 *  the topic stays shareable; inline (home tab) it's plain buttons driven by
 *  the tab's own state via `onTag`. */
export function HubTagStrip({ activeTag, condensed = false, onTag }) {
  return (
    <div
      role="tablist"
      aria-label="Interest topics"
      className={cn(
        "flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        !condensed && !onTag && "md:flex-wrap md:overflow-visible",
        !condensed && onTag && "md:mx-auto md:max-w-[720px]",
      )}
    >
      {INTEREST_TAGS.map((tag) => {
        const active = tag.id === activeTag;
        const cls = cn(
          chipBase,
          condensed ? "h-[30px] px-2.5 text-[12.5px]" : chipTap,
          tag.tone,
          active && chipActive,
          onTag && "cursor-pointer",
        );
        return onTag ? (
          <button
            key={tag.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTag(tag.id)}
            className={cls}
          >
            <ChipInner tag={tag} active={active} condensed />
          </button>
        ) : (
          <Link
            key={tag.id}
            href={`${HUB_PATH}?tag=${tag.id}`}
            role="tab"
            aria-selected={active}
            scroll={false}
            prefetch={false}
            className={cls}
          >
            <ChipInner tag={tag} active={active} condensed />
          </Link>
        );
      })}
    </div>
  );
}

/** Read-only chips on cards — each opens the hub pre-filtered to the topic. */
export function CardInterestTags({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const known = tags
    .slice(0, 3)
    .map((id) => interestTag(id))
    .filter(Boolean);
  if (known.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {known.map((tag) => (
        <Link
          key={tag.id}
          href={`${HUB_PATH}?tag=${tag.id}`}
          prefetch={false}
          title={`Explore ${tag.fullLabel || tag.label} posts`}
          aria-label={`Explore ${tag.fullLabel || tag.label} posts`}
          className={cn(chipBase, chipCard, tag.tone)}
        >
          <ChipInner tag={tag} condensed />
        </Link>
      ))}
    </div>
  );
}
