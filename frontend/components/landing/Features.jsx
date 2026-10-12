import {
  BarChart3,
  Bell,
  FileText,
  Hash,
  Images,
  School,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Reveal } from "./Reveal";

const large = [
  {
    icon: Images,
    tag: "Posts · Media · Polls",
    title: "Short posts that carry media",
    desc: "500 characters with multi-photo, GIF, and 60s video attachments — or a 2–4 option poll when you want votes. Edit your own anytime, thread replies below.",
    chips: [
      "500 chars",
      "multi-photo / GIF / video",
      "2–4 option polls",
      "edit + threads",
    ],
  },
  {
    icon: FileText,
    tag: "Articles · 50k Markdown",
    title: "Go long when it matters",
    desc: "Placement notes, hackathon writeups, club guides — title + 50k Markdown body at @you/slug, with ${you/slug} mentions anywhere and a reader built for code.",
    chips: [
      "@you/slug URLs",
      "${you/slug} embeds",
      "code + tables",
      "separate tab",
    ],
  },
];

const small = [
  {
    icon: BarChart3,
    title: "Author analytics",
    desc: "Deduped views per post, 24h / 7d overview, and top-5 by views. Only you see your reach.",
  },
  {
    icon: UserRoundCheck,
    title: "Merit verification",
    desc: "50+ posts or 100+ followers to apply. Blue tick reviewed by admins, 7-day re-appeal cooldown.",
  },
  {
    icon: School,
    title: "Colleges + discovery",
    desc: "College pages with members and college-only feeds. Suggestions, Following + Discovery tabs, full-text search.",
  },
  {
    icon: Hash,
    title: "Hashtags + mentions",
    desc: "Tags and @mentions extracted automatically. Trending sidebar, tag feeds, autocomplete while typing.",
  },
  {
    icon: Bell,
    title: "Realtime, even closed",
    desc: "Follows, likes, replies, reposts over SSE (25s heartbeat, replay buffer) plus Web Push via VAPID.",
  },
  {
    icon: ShieldCheck,
    title: "Private + safe",
    desc: "Private accounts with follow requests, reply/mention policies, mutual-hide block, report + appeals, OTP email.",
  },
];

export function Features() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <p className="text-[13px] font-bold uppercase tracking-widest text-[var(--cz-accent)]">
          What ships today
        </p>
        <h2 className="mt-2 max-w-[24ch] text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[36px]">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          The core loop is live — discover, follow, post, interact — plus the
          creator layer the codebase already runs: long-form articles,
          per-author insights, and merit verification.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {large.map(({ icon: Icon, tag, title, desc, chips }) => (
          <Reveal key={title}>
            <article className="group h-full overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-5 transition-colors hover:bg-[var(--cz-surface-strong)]/40 sm:p-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--cz-accent-soft)] px-3 py-1 text-[12px] font-bold text-[var(--cz-accent)]">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {tag}
              </span>
              <h3 className="mt-3 text-[20px] font-extrabold leading-[26px] tracking-tight text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-2 max-w-[52ch] text-[15px] leading-[21px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-[var(--cz-border-strong)] px-3 py-1 text-[13px] font-medium text-[var(--cz-text-secondary)]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {small.map(({ icon: Icon, title, desc }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.06}>
            <article className="h-full rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-5 transition-all hover:-translate-y-0.5 hover:bg-[var(--cz-surface-strong)]/40">
              <Icon
                size={20}
                strokeWidth={1.8}
                className="text-[var(--cz-text-secondary)]"
                aria-hidden
              />
              <h3 className="mt-3 text-[16px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <p className="mt-6 flex items-center gap-2 text-[13px] text-[var(--cz-text-tertiary)]">
          <Search className="h-4 w-4" aria-hidden />
          Pinned posts, bookmarks, dark mode with no-flash theme, guest blur
          after 20 profiles — all in the app today.
        </p>
      </Reveal>
    </section>
  );
}
