import Link from "next/link";

export const metadata = {
  title: "Terms — CampusZen",
  description: "CampusZen Terms of Service for the student social network MVP.",
};

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">{title}</h2>
      <div className="text-[13px] leading-[22px] text-[var(--cz-text-secondary)] space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/80 backdrop-blur">
        <div className="mx-auto max-w-[880px] px-4 sm:px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-[8px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[12px]">CZ</span>
            <span className="text-[14px] font-semibold tracking-[-0.03em]">campuszen</span>
          </Link>
          <nav className="flex items-center gap-4 text-[13px]">
            <Link href="/signup" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]">Sign up</Link>
            <Link href="/login" className="rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-3.5 py-1.5 text-[12px] font-medium hover:bg-[#ffd9c0] transition-colors">Log in</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.18)] to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">
              Legal • Last updated 25 Sep 2026
            </p>
            <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.04em] leading-none text-[var(--cz-text-primary)]">Terms of Service</h1>
            <p className="mt-3 text-[13px] leading-[20px] text-[var(--cz-text-secondary)] max-w-[68ch]">
              These terms cover the CampusZen MVP — a student-focused social network for discovering students, sharing posts, and interacting via likes, replies and reposts. By creating an account you agree to these terms.
            </p>

            <div className="mt-8 grid gap-8">
              <Section title="1. Who can use CampusZen">
                <p>
                  CampusZen is built for students. You must be at least 13 years old and provide accurate information at signup — display name, username, email and password. Usernames must be unique and may not impersonate others. We may suspend accounts that violate these rules.
                </p>
              </Section>

              <Section title="2. Your account & security">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--cz-muted)]">
                  <li>You are responsible for keeping your password secure. Passwords are hashed and must never be shared.</li>
                  <li>We use HTTP-only cookies for sessions, rate limiting and Zod validation on sensitive endpoints.</li>
                  <li>Verify your email via OTP to activate posting, following and notifications.</li>
                  <li>Do not attempt to access or modify another user’s account.</li>
                </ul>
              </Section>

              <Section title="3. What’s allowed">
                <p>
                  MVP supports text posts (up to 500 characters), likes, replies, reposts, following, search for users/posts, in-app notifications, and report/block. Keep content respectful and lawful. Don’t post spam, hate, harassment, or copyrighted material you don’t own.
                </p>
                <p className="text-[12px] leading-[18px] text-[var(--cz-text-secondary)]/80 border-l-2 border-[var(--cz-muted)]/30 pl-3">
                  Out of MVP: DMs, communities, stories, clips, payments, and advanced verification — those belong to V1–V3 per PRD §23 and do not affect these terms.
                </p>
              </Section>

              <Section title="4. Moderation & reporting">
                <p>
                  You can report posts/users and block users. We may remove content or suspend accounts after review. Reports are handled by a basic admin moderation queue in MVP; no automated advanced moderation is promised yet.
                </p>
              </Section>

              <Section title="5. Your content & license">
                <p>
                  You retain ownership of posts you create. You grant CampusZen a non-exclusive license to host and display your posts within the service for the purpose of operating the feed, search and notifications. You can delete your own posts at any time.
                </p>
              </Section>

              <Section title="6. Changes & contact">
                <p>
                  We may update these terms as we move from MVP to V1 (hashtags, bookmarks, media uploads). Continued use after an update means you accept the new terms. Questions? Contact{" "}
                  <a href="mailto:support@campuszen.app" className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4">support@campuszen.app</a>.
                </p>
              </Section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--cz-border)] pt-6">
              <Link href="/privacy" className="inline-flex items-center justify-center rounded-[10px] border border-[var(--cz-border)] bg-transparent px-4 py-2 text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors">
                View Privacy Policy
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-[10px] bg-[var(--cz-text-primary)] px-4 py-2 text-[13px] font-medium text-[var(--cz-text-inverse)] hover:bg-[#ffd9c0] transition-colors">
                Create account
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">CampusZen • Student Network • India</p>
      </main>
    </div>
  );
}
