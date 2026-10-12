import Link from "next/link";
import { HeroVisual } from "./HeroVisual";
import { Reveal } from "./Reveal";

const stats = [
  ["500", "chars per post"],
  ["50k", "article body"],
  ["24h", "insights range"],
];

export function Hero() {
  return (
    <section className="py-12 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--cz-border-strong)] bg-[var(--cz-surface)] px-3 py-1 text-[13px] font-bold leading-[18px] text-[var(--cz-text-secondary)]">
              <span
                className="h-2 w-2 rounded-full bg-[var(--cz-success)]"
                aria-hidden
              />
              New · Articles, Analytics &amp; Verification live
            </p>
            <h1 className="mt-4 text-[42px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[var(--cz-text-primary)] sm:text-[60px]">
              Campus life,
              <br />
              in one live feed.
            </h1>
          </Reveal>

          <Reveal delay={0.06}>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-[24px] text-[var(--cz-text-secondary)]">
              Find students by college, course, and year. Post 500-character
              updates with photos, GIFs, short video, or 2–4 option polls — then
              go long with 50k Markdown articles. Likes, replies, reposts,
              hashtags, and realtime notifications included.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-[48px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-7 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-all hover:bg-[var(--cz-accent-hover)] active:scale-[0.98]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-[48px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] bg-[var(--cz-surface)] px-7 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] active:scale-[0.98]"
              >
                Log in
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/u"
                className="t-learn inline-flex items-center gap-1 text-[14px] font-bold text-[var(--cz-accent)]"
              >
                Explore students
                <span className="t-learn-chevron" aria-hidden>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      className="t-learn-arm t-learn-arm-top"
                      d="M6 4L10 8"
                    />
                    <path
                      className="t-learn-arm t-learn-arm-bot"
                      d="M10 8L6 12"
                    />
                  </svg>
                </span>
              </Link>
              <Link
                href="/c"
                className="t-learn inline-flex items-center gap-1 text-[14px] font-bold text-[var(--cz-accent)]"
              >
                Browse colleges
                <span className="t-learn-chevron" aria-hidden>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      className="t-learn-arm t-learn-arm-top"
                      d="M6 4L10 8"
                    />
                    <path
                      className="t-learn-arm t-learn-arm-bot"
                      d="M10 8L6 12"
                    />
                  </svg>
                </span>
              </Link>
            </div>
            <p className="mt-4 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              Free to join · OTP-verified email · Private accounts +
              block/report
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <dl className="mt-7 flex items-stretch gap-6 border-t border-[var(--cz-border)] pt-5">
              {stats.map(([v, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="t-digit-group is-animating text-[22px] font-extrabold tracking-tight text-[var(--cz-text-primary)]">
                    {v.split("").map((ch, i, arr) => (
                      <span
                        key={i}
                        className="t-digit"
                        data-stagger={
                          i === arr.length - 2
                            ? "1"
                            : i === arr.length - 1
                              ? "2"
                              : undefined
                        }
                      >
                        {ch}
                      </span>
                    ))}
                  </dd>
                  <dd className="mt-0.5 text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal delay={0.14} y={20}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
