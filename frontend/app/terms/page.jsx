import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export const metadata = {
  title: "Terms",
  description:
    "The CampusZen Terms of Service explain who can join, what is allowed, and how moderation works. Please read them before creating your account.",
};

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[17px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-[53px] max-w-[700px] items-center justify-between px-4">
          <Link
            href="/"
            className="text-[var(--cz-text-primary)] transition-opacity hover:opacity-70"
            aria-label="CampusZen home"
          >
            <BrandMark size={26} title="CampusZen" />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Legal">
            <Link
              href="/privacy"
              className="inline-flex h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              Privacy
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[34px] items-center rounded-full bg-[var(--cz-accent)] px-4 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[700px] px-4 py-10">
        <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em]">
          Terms of Service
        </h1>
        <p className="mt-2 text-[13px] text-[var(--cz-text-tertiary)]">
          Last updated 25 Sep 2026
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          These terms cover the CampusZen MVP — a student-focused social network
          for discovering students, sharing posts, and interacting via likes,
          replies and reposts. By creating an account you agree to these terms.
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Who can use CampusZen">
            <p>
              CampusZen is built for students. You must be at least 13 years
              old and provide accurate information at signup — display name,
              username, email and password. Usernames must be unique and may not
              impersonate others. We may suspend accounts that violate these
              rules.
            </p>
          </Section>

          <Section title="2. Your account & security">
            <ul className="list-disc space-y-2 pl-5 marker:text-[var(--cz-text-tertiary)]">
              <li>
                You are responsible for keeping your password secure. Passwords
                are hashed and must never be shared.
              </li>
              <li>
                We use HTTP-only cookies for sessions, rate limiting and Zod
                validation on sensitive endpoints.
              </li>
              <li>
                Verify your email via OTP to activate posting, following and
                notifications.
              </li>
              <li>Do not attempt to access or modify another user&apos;s account.</li>
            </ul>
          </Section>

          <Section title="3. What's allowed">
            <p>
              The MVP supports text posts (up to 500 characters), likes,
              replies, reposts, following, search for users and posts, in-app
              notifications, and report and block. Keep content respectful and
              lawful. Don&apos;t post spam, hate, harassment, or copyrighted
              material you don&apos;t own.
            </p>
            <p className="border-l-2 border-[var(--cz-accent)] pl-3 text-[13px]">
              Out of MVP: DMs, communities, stories, clips, payments, and
              advanced verification — those belong to V1–V3 and do not affect
              these terms.
            </p>
          </Section>

          <Section title="4. Moderation & reporting">
            <p>
              You can report posts and users, and block users. We may remove
              content or suspend accounts after review. Reports are handled by a
              basic admin moderation queue in the MVP; no automated advanced
              moderation is promised yet.
            </p>
          </Section>

          <Section title="5. Your content & license">
            <p>
              You retain ownership of posts you create. You grant CampusZen a
              non-exclusive license to host and display your posts within the
              service for the purpose of operating the feed, search and
              notifications. You can delete your own posts at any time.
            </p>
          </Section>

          <Section title="6. Changes & contact">
            <p>
              We may update these terms as we move from MVP to V1 (hashtags,
              bookmarks, media uploads). Continued use after an update means you
              accept the new terms. Questions? Contact{" "}
              <a
                href="mailto:support@campuszen.app"
                className="text-[var(--cz-accent)] hover:underline"
              >
                support@campuszen.app
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--cz-border)] pt-6">
          <Link
            href="/privacy"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            View Privacy Policy
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-5 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            Create account
          </Link>
        </div>

        <p className="mt-8 text-center text-[13px] text-[var(--cz-text-tertiary)]">
          CampusZen · Student Network · India
        </p>
      </main>
    </div>
  );
}
