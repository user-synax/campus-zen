import Link from "next/link";

export const metadata = {
  title: "Privacy — CampusZen",
  description: "CampusZen Privacy Policy for the student social network MVP.",
};

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">{title}</h2>
      <div className="text-[13px] leading-[22px] text-[var(--cz-text-secondary)] space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/80 backdrop-blur">
        <div className="mx-auto max-w-[880px] px-4 sm:px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-[8px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[12px]">CZ</span>
            <span className="text-[14px] font-semibold tracking-[-0.03em]">campuszen</span>
          </Link>
          <nav className="flex items-center gap-4 text-[13px]">
            <Link href="/terms" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]">Terms</Link>
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
            <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.04em] leading-none text-[var(--cz-text-primary)]">Privacy Policy</h1>
            <p className="mt-3 text-[13px] leading-[20px] text-[var(--cz-text-secondary)] max-w-[68ch]">
              CampusZen MVP collects only what’s needed to run a student social network — accounts, profiles, posts and interactions. We don’t sell your data. This policy explains what we collect and how we use it during the MVP and beyond (V1–V3).
            </p>

            <div className="mt-8 grid gap-8">
              <Section title="1. Data we collect">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--cz-muted)]">
                  <li><span className="text-[var(--cz-text-primary)] font-medium">Account:</span> full name, username, email (gmail.com / proton.me in MVP), hashed password, OTP verification state.</li>
                  <li><span className="text-[var(--cz-text-primary)] font-medium">Profile (after signup):</span> display name, bio, college, course/branch, academic year, avatar, follower counts.</li>
                  <li><span className="text-[var(--cz-text-primary)] font-medium">Content:</span> posts (text up to 500 chars), likes, replies, reposts, follow edges, reports/blocks.</li>
                  <li><span className="text-[var(--cz-text-primary)] font-medium">Technical:</span> session cookie, device, and rate-limit logs. No DMs, location or payments in MVP.</li>
                </ul>
              </Section>

              <Section title="2. How we use it">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--cz-muted)]">
                  <li>Create and secure your account, verify email, keep you logged in via HTTP-only cookies.</li>
                  <li>Show discover, following feed (sorted by createdAt DESC), search, notifications (follow/like/reply/repost).</li>
                  <li>Moderate reports and enforce blocks.</li>
                  <li>Improve performance on low-mid devices and mobile networks per PRD §21.</li>
                </ul>
              </Section>

              <Section title="3. Sharing & retention">
                <p>
                  We don’t sell or rent your data. We share only with infrastructure needed to run the service (hosting, database MongoDB, email OTP provider) under strict confidentiality. Posts and profiles are visible according to your follow settings; MVP has no private-post scope yet.
                </p>
                <p>We retain data until you delete your account or content. Session logs are rotated periodically.</p>
              </Section>

              <Section title="4. Your choices & rights">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--cz-muted)]">
                  <li>Edit your profile, delete your posts, unfollow or block users at any time.</li>
                  <li>Request export or deletion via <a href="mailto:privacy@campuszen.app" className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4">privacy@campuszen.app</a>.</li>
                  <li>Opt out of non-essential notifications once notification preferences ship in V1.</li>
                </ul>
              </Section>

              <Section title="5. Security">
                <p>
                  Passwords are hashed, auth uses secure HTTP-only cookies, inputs are validated with Zod, and sensitive routes are rate limited and checked for authorization. No system is 100% secure — use a strong, unique password and don’t reuse it.
                </p>
              </Section>

              <Section title="6. Changes">
                <p>
                  As we add image uploads, hashtags, bookmarks, and verification (V1), we’ll update this policy and notify you in-app. Continued use after an update means you accept the changes.
                </p>
              </Section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--cz-border)] pt-6">
              <Link href="/terms" className="inline-flex items-center justify-center rounded-[10px] border border-[var(--cz-border)] bg-transparent px-4 py-2 text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors">
                View Terms
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-[10px] bg-[var(--cz-muted)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#6b70d6] transition-colors">
                Join CampusZen
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">We’ll never ask for your password via email.</p>
      </main>
    </div>
  );
}
