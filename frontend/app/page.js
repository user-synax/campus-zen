import Link from "next/link";
import { LandingRedirect } from "@/components/landing/LandingRedirect";

const steps = [
  [
    "01",
    "Discover students",
    "Find people by college, course, and year — not by algorithm roulette.",
  ],
  [
    "02",
    "Follow your people",
    "Build a feed out of classmates, seniors, and hackathon teammates.",
  ],
  [
    "03",
    "Post short updates",
    "Thoughts, questions, wins — up to 500 characters. Edit or delete anytime.",
  ],
  [
    "04",
    "Interact, get notified",
    "Like, reply, and repost. You'll know when someone messes with your stuff.",
  ],
];

const features = [
  [
    "Student profiles",
    "College, course, and year on every profile, with follower counts.",
  ],
  [
    "Text-first posts",
    "500 characters, chronological. No reels, no endless feed.",
  ],
  [
    "Likes, replies, reposts",
    "The full core loop for conversations that go somewhere.",
  ],
  ["Student search", "Search across students and posts to find your crowd."],
  ["Notifications", "Follows, likes, replies, and reposts — in-app, no spam."],
  [
    "Secure by default",
    "Verified emails, hashed passwords, HTTP-only sessions.",
  ],
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <LandingRedirect />

      {/* nav */}
      <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-[1080px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--cz-text-primary)] text-[13px] font-bold tracking-[-0.04em] text-[var(--cz-text-inverse)]">
              CZ
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">
              campuszen
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-1.5 text-[13px] font-medium text-[var(--cz-text-secondary)] transition-colors hover:text-[var(--cz-text-primary)] sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 sm:px-6">
        {/* hero */}
        <section className="py-16 sm:py-24">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cz-text-secondary)]">
            A social network for students
          </p>
          <h1 className="mt-5 max-w-[16ch] text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">
            Where campus actually connects.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-[25px] text-[var(--cz-text-secondary)]">
            CampusZen is a student-only network. Find people from your college
            and course, share short posts, and keep up with campus life —
            without the noise of everywhere else.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[var(--cz-text-primary)] px-6 text-[14px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-[var(--cz-border)] px-6 text-[14px] font-medium text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface)]"
            >
              Log in
            </Link>
          </div>
          <p className="mt-5 text-[12px] leading-[18px] text-[var(--cz-text-secondary)]/70">
            Free to join &middot; Verified student emails only
          </p>
        </section>

        {/* how it works */}
        <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cz-text-secondary)]">
            How it works
          </p>
          <h2 className="mt-4 max-w-[24ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
            The whole loop, in four steps.
          </h2>
          <ol className="mt-10">
            {steps.map(([n, title, desc]) => (
              <li
                key={n}
                className="flex items-baseline gap-5 border-t border-[var(--cz-border)] py-5 last:border-b sm:gap-8"
              >
                <span className="shrink-0 text-[12px] font-medium tabular-nums text-[var(--cz-text-secondary)]/70">
                  {n}
                </span>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="shrink-0 text-[15px] font-medium tracking-[-0.01em] sm:w-[220px]">
                    {title}
                  </span>
                  <span className="text-[14px] leading-[22px] text-[var(--cz-text-secondary)]">
                    {desc}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* features */}
        <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cz-text-secondary)]">
            What&apos;s inside
          </p>
          <h2 className="mt-4 max-w-[24ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, desc]) => (
              <div
                key={title}
                className="border-t border-[var(--cz-border)] py-5"
              >
                <h3 className="text-[14px] font-medium tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* cta */}
        <section className="border-t border-[var(--cz-border)] py-14 text-center sm:py-20">
          <h2 className="mx-auto max-w-[20ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
            Ready to find your people?
          </h2>
          <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-[22px] text-[var(--cz-text-secondary)]">
            Two-minute signup. Verify your email, complete your profile, and
            you&apos;re in.
          </p>
          <div className="mt-7">
            <Link
              href="/signup"
              className="inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[var(--cz-text-primary)] px-8 text-[14px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
            >
              Join CampusZen
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[var(--cz-text-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]"
            >
              Log in
            </Link>
          </p>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-[var(--cz-border)]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 py-6 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="inline-flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[var(--cz-text-primary)] text-[10px] font-bold text-[var(--cz-text-inverse)]">
              CZ
            </span>
            <span className="text-[var(--cz-text-secondary)]">
              &copy; 2026 CampusZen
            </span>
          </span>
          <nav className="flex items-center gap-4 text-[var(--cz-text-secondary)]">
            <Link
              href="/login"
              className="transition-colors hover:text-[var(--cz-text-primary)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-[var(--cz-text-primary)]"
            >
              Sign up
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-[var(--cz-text-primary)]"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-[var(--cz-text-primary)]"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
