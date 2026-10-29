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
          Last updated 29 Oct 2026
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          These terms cover CampusZen as it exists today — a student-focused
          social network for discovering students, sharing posts, and
          interacting via likes, replies and reposts. The service includes text
          and media posts, polls, long-form articles, anonymous hub posts,
          hashtags and interest hubs, college pages, notifications, and
          moderation. By creating an account you agree to these terms.
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Who can use CampusZen">
            <p>
              CampusZen is built for students. You must be at least 13 years old.
              If you are 13–17, a parent or lawful guardian must approve your
              account before it can be used: we email them a 6-digit code and
              record their consent. Accounts for children under 13 are not
              permitted. Provide accurate information at signup — display name,
              username, email, password and date of birth. New accounts are limited to{" "}
              <Strong>gmail.com</Strong> or <Strong>proton.me</Strong> email
              addresses. Usernames must be unique and may not impersonate
              others. Email verification via a 6-digit OTP is required before
              posting, following or receiving notifications. We may suspend
              accounts that violate these rules.
            </p>
          </Section>

          <Section title="2. Your account & security">
            <Bullets>
              <li>
                You are responsible for keeping your password secure. Passwords
                are hashed and must never be shared.
              </li>
              <li>
                We use HTTP-only cookies for sessions, per-route rate limiting
                and Zod validation on sensitive endpoints. Sessions are tracked
                per device and can be revoked individually from your settings.
              </li>
              <li>
                Verify your email via OTP to activate posting, following and
                notifications. Password reset also uses a 6-digit OTP.
              </li>
              <li>
                Your date of birth, if you set it, is recorded once and cannot
                be changed. It is used for the age gate and the 18+ content
                gate. If you are under 18, the account stays read-only until
                your guardian approves it.
              </li>
              <li>
                You can withdraw consent at any time. Withdrawing core consent
                deactivates the account and schedules it for deletion; optional
                analytics consent can be withdrawn without deleting the account.
              </li>
              <li>
                Do not attempt to access or modify another user&apos;s account.
              </li>
            </Bullets>
          </Section>

          <Section title="3. What's allowed">
            <p>
              The service supports text posts (up to 500 characters),
              multi-attachment media (images, GIFs and short video with
              posters), 2–4 option polls, long-form articles (up to 50,000
              characters), replies, reposts, bookmarks, likes, following, search
              for users and posts, in-app and push notifications, hashtags,
              mentions, interest hubs (coding, design, cybersecurity, devops,
              drawing, business), college pages, and anonymous hub posts. Keep
              content respectful and lawful. Don&apos;t post spam, hate,
              harassment, or copyrighted material you don&apos;t own.
            </p>
            <Bullets>
              <li>
                <Strong>18+ content:</Strong> you may mark a post as sensitive.
                Viewers opt in to revealing such content in their settings, and
                only after recording a date of birth of 18+.
              </li>
              <li>
                <Strong>Anonymous hub:</Strong> posts are masked in public
                output, but the real author is retained for moderation.
                Don&apos;t use anonymous posts to evade these terms.
              </li>
              <li>
                <Strong>Privacy controls:</Strong> you can make your account
                private, restrict who can reply or mention you, and control
                visibility of college, course and academic year.
              </li>
            </Bullets>
            <p className="border-l-2 border-[var(--cz-accent)] pl-3 text-[13px]">
              Still out of scope: DMs, communities, stories, clips, payments,
              and any feature listed under V1–V3 of the roadmap. Those do not
              affect these terms until they ship.
            </p>
          </Section>

          <Section title="4. Moderation & reporting">
            <p>
              You can report posts and users (with a reason and optional
              details) and block users. Reports are handled by a moderation
              queue; accounts may be limited, restricted (read-only for a set
              period), suspended or banned after review. You can appeal report
              decisions, suspensions and post removals. Admins may also send
              in-app announcements. We may remove content or suspend accounts
              after review; no automated advanced moderation is promised.
            </p>
          </Section>

          <Section title="5. Your content & license">
            <p>
              You retain ownership of posts you create. You grant CampusZen a
              non-exclusive license to host and display your posts within the
              service for the purpose of operating the feed, search,
              notifications and analytics. You can edit or delete your own posts
              at any time. Edited posts are marked as edited. View counts are
              recorded for your own analytics.
            </p>
          </Section>

          <Section title="6. Privacy">
            <p>
              Our data practices are described in the{" "}
              <Link
                href="/privacy"
                className="text-[var(--cz-accent)] hover:underline"
              >
                Privacy Policy
              </Link>
              . We process account data on the basis of your consent, which you
              give at signup or in the consent screen. You can access, correct,
              erase, withdraw consent, nominate a person and raise a grievance
              as described in the notice. The Grievance Officer is available at{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              ; we respond within 30 days (and no later than 90).
            </p>
          </Section>

          <Section title="7. Third-party services">
            <p>
              CampusZen relies on third-party infrastructure to run: MongoDB for
              data storage, Appwrite for file storage (avatars, covers, post
              media), Resend or Gmail SMTP for OTP email delivery, Web Push
              (VAPID) for OS-level notifications, and Vercel for hosting and
              performance analytics. Your use of the service is also subject to
              those providers&apos; terms and privacy policies.
            </p>
          </Section>

          <Section title="8. Changes & contact">
            <p>
              We may update these terms as we ship new features. Continued use
              after an update means you accept the new terms. Questions? Contact{" "}
              <a
                href="mailto:support@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                support@campuszen.tech
              </a>
              . For data and privacy requests, including guardian consent and
              withdrawal, see the Privacy Notice or email the Grievance Officer
              at{" "}
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
