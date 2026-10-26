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
          Last updated 26 Oct 2026
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen collects only what is needed to run a student social network
          — accounts, profiles, posts and interactions. We don&apos;t sell your
          data. This policy explains what we collect and how we use it across
          the service today.
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Data we collect">
            <Bullets>
              <li>
                <Strong>Account:</Strong> full name, username, email (gmail.com
                / proton.me for new signups), hashed password, email
                verification state, account status, badges (owner, pro,
                verified), and last login time.
              </li>
              <li>
                <Strong>Profile:</Strong> display name, bio, college, college
                slug, course/branch, academic year, avatar, cover image, accent
                color, pinned post, social links (GitHub, X, LinkedIn,
                Instagram), follower/following/post counts, and privacy settings
                (private account, reply and mention policies, per-field
                visibility, sensitive-content preference).
              </li>
              <li>
                <Strong>Date of birth:</Strong> if you set it, stored once and
                never editable, used only for the 18+ content gate.
              </li>
              <li>
                <Strong>Content:</Strong> posts (text up to 500 chars), media
                attachments (images, GIFs, short video with posters), polls (2–4
                options and votes), long-form articles (up to 50,000 chars),
                replies (up to 500 chars), reposts, bookmarks, follow edges,
                blocks, reports, appeals, follow requests, hashtags, mentions,
                interest tags, view counts, and anonymous hub posts (author
                retained for moderation).
              </li>
              <li>
                <Strong>Notifications:</Strong> in-app notifications for
                follows, likes, replies, reposts, mentions, follow requests,
                report/appeal updates, and admin broadcasts.
              </li>
              <li>
                <Strong>Push & sessions:</Strong> Web Push subscription
                endpoints and keys, device user agent and platform, session
                records per signed-in device (IP address, device label, remember
                preference, expiry), and OTP records (hashed, with attempt
                counts and expiry).
              </li>
              <li>
                <Strong>Technical:</Strong> session cookie, device and
                rate-limit logs, post view events (viewer and day), and
                verification requests (counts and message). No location or
                payments.
              </li>
            </Bullets>
          </Section>

          <Section title="2. How we use it">
            <Bullets>
              <li>
                Create and secure your account, verify email, and keep you
                logged in via HTTP-only cookies across devices.
              </li>
              <li>
                Show discover, the following feed (cursor-paginated), search,
                college pages, interest hubs, and notifications for follow,
                like, reply, repost and mention.
              </li>
              <li>
                Power anonymous hub posts, bookmarks, polls, articles, and
                author analytics (views and engagement over 24h/7d).
              </li>
              <li>
                Moderate reports, appeals and verification requests, and enforce
                blocks and account statuses.
              </li>
              <li>
                Send transactional email (OTP verification and password reset)
                and optional OS-level push notifications.
              </li>
              <li>
                Improve performance on low-end devices and mobile networks.
              </li>
            </Bullets>
          </Section>

          <Section title="3. Sharing & third parties">
            <p>
              We don&apos;t sell or rent your data. We share only with the
              infrastructure needed to run the service, under strict
              confidentiality:
            </p>
            <Bullets>
              <li>
                <Strong>MongoDB</Strong> — primary data storage.
              </li>
              <li>
                <Strong>Appwrite</Strong> — file storage for avatars, covers and
                post media (server-side only).
              </li>
              <li>
                <Strong>Resend or Gmail SMTP</Strong> — delivery of OTP and
                password-reset emails.
              </li>
              <li>
                <Strong>Web Push (VAPID)</Strong> — OS-level notifications when
                the app is closed.
              </li>
              <li>
                <Strong>Vercel</Strong> — hosting, plus anonymous usage and
                performance analytics (Analytics and Speed Insights).
              </li>
            </Bullets>
            <p>
              Posts and profiles are visible according to your privacy settings;
              private accounts require follow approval, and academic fields can
              be hidden or followers-only. Content you mark sensitive is blurred
              by default for other viewers.
            </p>
          </Section>

          <Section title="4. Retention & deletion">
            <p>
              We retain data until you delete your account or content. You can
              delete individual posts at any time. Account deletion removes your
              data; deactivation hides your account for a 30-day grace period
              before permanent purge. You can export your data at any time. OTP
              and session records expire automatically. Session and view logs
              are rotated periodically.
            </p>
          </Section>

          <Section title="5. Your choices & rights">
            <Bullets>
              <li>
                Edit your profile, privacy settings, pinned post, and social
                links at any time.
              </li>
              <li>
                Delete your posts, unfollow or block users, and manage follow
                requests at any time.
              </li>
              <li>
                Opt in or out of sensitive content, and set your date of birth
                once for the 18+ gate.
              </li>
              <li>
                Manage push notification subscriptions and signed-in sessions
                from your settings.
              </li>
              <li>
                Request export or deletion via{" "}
                <a
                  href="mailto:privacy@campuszen.tech"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  privacy@campuszen.tech
                </a>
                .
              </li>
              <li>
                Appeal moderation decisions and verification outcomes through
                the in-app appeals flow.
              </li>
            </Bullets>
          </Section>

          <Section title="6. Security">
            <p>
              Passwords are hashed, auth uses secure HTTP-only cookies, inputs
              are validated with Zod, and sensitive routes are rate limited and
              checked for authorization. Sessions are tracked per device with
              replay protection. No system is 100% secure — use a strong, unique
              password and don&apos;t reuse it.
            </p>
          </Section>

          <Section title="7. Children">
            <p>
              CampusZen is not intended for users under 13. We do not knowingly
              collect personal data from children under 13. If you believe a
              child under 13 has created an account, contact us and we will
              remove it.
            </p>
          </Section>

          <Section title="8. Cookies & tracking">
            <p>
              We use a session cookie (HTTP-only) to keep you signed in, a theme
              cookie to remember light/dark mode, and Vercel Analytics and Speed
              Insights for anonymous usage and performance measurement. You can
              disable analytics cookies in your browser; the app still works
              without them.
            </p>
          </Section>

          <Section title="9. Changes">
            <p>
              As we ship new features we&apos;ll update this policy and notify
              you in-app. Continued use after an update means you accept the
              changes.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              For data and privacy requests contact{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              . For security issues contact{" "}
              <a
                href="mailto:user-synax@proton.me"
                className="text-[var(--cz-accent)] hover:underline"
              >
                user-synax@proton.me
              </a>
              . General questions:{" "}
              <a
                href="mailto:support@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                support@campuszen.tech
              </a>
              .
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
