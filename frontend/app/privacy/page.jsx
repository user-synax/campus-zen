import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export const metadata = {
  title: "Privacy",
  description:
    "The CampusZen Privacy Policy explains what data we collect, how we use it, and your choices. Your data is never sold.",
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

function Bullets({ children }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[var(--cz-text-tertiary)]">
      {children}
    </ul>
  );
}

const Strong = ({ children }) => (
  <span className="font-bold text-[var(--cz-text-primary)]">{children}</span>
);

export default function PrivacyPage() {
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
              href="/terms"
              className="inline-flex h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              Terms
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

      {/* Plain prose on the bare canvas — no card, no gradient hairline. */}
      <main className="mx-auto max-w-[700px] px-4 py-10">
        <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[13px] text-[var(--cz-text-tertiary)]">
          Last updated 25 Sep 2026
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen collects only what is needed to run a student social
          network — accounts, profiles, posts and interactions. We don&apos;t
          sell your data. This policy explains what we collect and how we use
          it during the MVP and beyond (V1–V3).
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Data we collect">
            <Bullets>
              <li>
                <Strong>Account:</Strong> full name, username, email
                (gmail.com / proton.me in MVP), hashed password, OTP
                verification state.
              </li>
              <li>
                <Strong>Profile:</Strong> display name, bio, college,
                course/branch, academic year, avatar, follower counts.
              </li>
              <li>
                <Strong>Content:</Strong> posts (text up to 500 chars), likes,
                replies, reposts, follow edges, reports and blocks.
              </li>
              <li>
                <Strong>Technical:</Strong> session cookie, device and
                rate-limit logs. No DMs, location or payments in MVP.
              </li>
            </Bullets>
          </Section>

          <Section title="2. How we use it">
            <Bullets>
              <li>
                Create and secure your account, verify email, and keep you
                logged in via HTTP-only cookies.
              </li>
              <li>
                Show discover, the following feed (sorted newest first),
                search, and notifications for follow, like, reply and repost.
              </li>
              <li>Moderate reports and enforce blocks.</li>
              <li>Improve performance on low-end devices and mobile networks.</li>
            </Bullets>
          </Section>

          <Section title="3. Sharing & retention">
            <p>
              We don&apos;t sell or rent your data. We share only with the
              infrastructure needed to run the service (hosting, MongoDB, the
              email OTP provider) under strict confidentiality. Posts and
              profiles are visible according to your follow settings; the MVP
              has no private-post scope yet.
            </p>
            <p>
              We retain data until you delete your account or content. Session
              logs are rotated periodically.
            </p>
          </Section>

          <Section title="4. Your choices & rights">
            <Bullets>
              <li>
                Edit your profile, delete your posts, unfollow or block users
                at any time.
              </li>
              <li>
                Request export or deletion via{" "}
                <a
                  href="mailto:privacy@campuszen.app"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  privacy@campuszen.app
                </a>
                .
              </li>
              <li>
                Opt out of non-essential notifications once notification
                preferences ship in V1.
              </li>
            </Bullets>
          </Section>

          <Section title="5. Security">
            <p>
              Passwords are hashed, auth uses secure HTTP-only cookies, inputs
              are validated with Zod, and sensitive routes are rate limited and
              checked for authorization. No system is 100% secure — use a
              strong, unique password and don&apos;t reuse it.
            </p>
          </Section>

          <Section title="6. Changes">
            <p>
              As we add image uploads, hashtags, bookmarks and verification
              (V1), we&apos;ll update this policy and notify you in-app.
              Continued use after an update means you accept the changes.
            </p>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--cz-border)] pt-6">
          <Link
            href="/terms"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            View Terms
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-5 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            Join CampusZen
          </Link>
        </div>

        <p className="mt-8 text-center text-[13px] text-[var(--cz-text-tertiary)]">
          We&apos;ll never ask for your password via email.
        </p>
      </main>
    </div>
  );
}
