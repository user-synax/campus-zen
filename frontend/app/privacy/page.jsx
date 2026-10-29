import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export const metadata = {
  title: "Privacy Notice",
  description:
    "CampusZen's DPDP Privacy Notice: what personal data we collect, why, how long we keep it, and how to exercise your rights.",
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

function DataTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[var(--cz-border)]">
      <table className="w-full border-collapse text-left text-[14px] leading-[20px]">
        <thead>
          <tr className="border-b border-[var(--cz-border)] bg-[var(--cz-surface-strong)]">
            <th className="px-3 py-2 font-bold text-[var(--cz-text-primary)]">
              Data
            </th>
            <th className="px-3 py-2 font-bold text-[var(--cz-text-primary)]">
              Why we collect it
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([data, why]) => (
            <tr
              key={data}
              className="border-b border-[var(--cz-border)] last:border-b-0"
            >
              <td className="px-3 py-2 align-top font-medium text-[var(--cz-text-primary)]">
                {data}
              </td>
              <td className="px-3 py-2 align-top text-[var(--cz-text-secondary)]">
                {why}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DATA_ROWS = [
  [
    "Account",
    "Full name, username, email, hashed password, email-verification state, badges, role and last login — to create, secure and identify your account.",
  ],
  [
    "Profile",
    "Display name, bio, college, course, academic year, avatar, cover, accent colour, pinned post, social links, custom profile links, counts and privacy settings — to run your public profile and discovery.",
  ],
  [
    "Age and guardian",
    "Date of birth, whether you are under 18, guardian name and email, consent status, consent time/IP/user agent — to apply the age gate and, for 13–17 accounts, to obtain and evidence verifiable guardian consent.",
  ],
  [
    "Content",
    "Posts, replies, articles, media, polls and votes, reposts, bookmarks, follows, blocks, reports, appeals, follow requests, hashtags, mentions, interest tags and anonymous hub posts (the real author is retained for moderation) — to publish and operate the service, and to keep it safe.",
  ],
  [
    "Interactions",
    "Likes, reposts, bookmarks, poll votes, post views and notification records — to show engagement counts, author analytics and in-app notifications.",
  ],
  [
    "Safety and moderation",
    "Reports you file or receive, appeal messages, verification requests, account-status records and moderation notes — to review reports, apply restrictions and handle appeals.",
  ],
  [
    "Sessions and devices",
    "Per-device session records, IP address, user-agent, platform, device label and expiry — to keep you signed in, detect refresh-token replay and let you revoke devices.",
  ],
  [
    "Push notifications",
    "Web Push endpoint, p256dh/auth keys and device details — only if you enable OS-level notifications.",
  ],
  [
    "Consent records",
    "Policy version, purposes, whether consent was given by you or a guardian, time, IP and user agent — to prove notice and consent, and to honour withdrawal.",
  ],
  [
    "Technical",
    "Session and theme cookies, CSRF/auth cookies, rate-limit counters, post-view events and OTP records — to operate, secure and debug the service.",
  ],
];

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

      <main className="mx-auto max-w-[700px] px-4 py-10">
        <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em]">
          Privacy Notice
        </h1>
        <p className="mt-2 text-[13px] text-[var(--cz-text-tertiary)]">
          Version 2026-10-29 · Last updated 29 October 2026
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen is the <Strong>Data Fiduciary</Strong> for the personal data
          described here. We process it on the basis of your consent, which you
          give when you create an account and accept this notice. This notice is
          written to meet the Digital Personal Data Protection Act, 2023 and the
          DPDP Rules, 2025.
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Who we are and how to reach us">
            <p>
              CampusZen is a student social network operated in India. For data
              protection questions, rights requests or complaints, contact our
              Grievance Officer at{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              . We aim to respond within 30 days and will not exceed 90 days
              without telling you why. General support:{" "}
              <a
                href="mailto:support@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                support@campuszen.tech
              </a>
              . Security issues:{" "}
              <a
                href="mailto:user-synax@proton.me"
                className="text-[var(--cz-accent)] hover:underline"
              >
                user-synax@proton.me
              </a>
              .
            </p>
          </Section>

          <Section title="2. Scope and key terms">
            <p>
              This notice covers personal data we process through CampusZen
              accounts, the website, the API, notifications and moderation. Under
              the DPDP Act, you are the <Strong>Data Principal</Strong>, we are
              the <Strong>Data Fiduciary</Strong>, and service providers who
              process data only on our instructions are{" "}
              <Strong>Data Processors</Strong>.
            </p>
            <p>
              We do not sell your personal data. We do not use it for targeted
              advertising, and we do not run advertising cookies. CampusZen is
              for users aged 13 and over; accounts for children under 13 are not
              permitted.
            </p>
          </Section>

          <Section title="3. What we collect and why">
            <DataTable rows={DATA_ROWS} />
            <p className="text-[13px] leading-[19px] text-[var(--cz-text-tertiary)]">
              We collect only what is needed for the purposes below. Where a
              field is optional (for example bio, college, course or social
              links), you can leave it blank.
            </p>
          </Section>

          <Section title="4. Consent, age and guardian approval">
            <Bullets>
              <li>
                <Strong>Your consent.</Strong> We ask you to take a clear
                affirmative action — ticking the consent box at signup or in the
                consent screen — before we process account data. The notice is
                presented before or with that request, and the consent is
                recorded with its version, time, IP address and user agent.
              </li>
              <li>
                <Strong>13–17 year olds.</Strong> If your date of birth shows
                that you are under 18, the account stays inactive until a parent
                or lawful guardian verifies their email with a one-time code and
                confirms they are 18 or older. We record the guardian&apos;s
                name, email, consent time and request details. We do not activate
                the account, and we do not send the child&apos;s verification
                code, before that approval.
              </li>
              <li>
                <Strong>Optional analytics.</Strong> Analytics consent is
                separate and optional. It is off unless you turn it on, and it is
                always off for under-18 accounts.
              </li>
              <li>
                <Strong>Language.</Strong> This notice is available in English.
                You can request a copy in any language listed in the Eighth
                Schedule to the Constitution by writing to{" "}
                <a
                  href="mailto:privacy@campuszen.tech"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  privacy@campuszen.tech
                </a>
                .
              </li>
            </Bullets>
          </Section>

          <Section title="5. How we use personal data">
            <Bullets>
              <li>Create, verify and secure your account; keep you signed in.</li>
              <li>
                Show your profile, posts, replies, articles, polls, media,
                college pages, interest hubs, search results and feeds according
                to your privacy settings.
              </li>
              <li>
                Deliver in-app notifications, optional Web Push notifications,
                and transactional email such as OTPs and password resets.
              </li>
              <li>
                Moderate reports and appeals, enforce blocks, restrictions,
                suspensions and bans, and protect users from abuse.
              </li>
              <li>
                Provide author analytics (views and engagement) and aggregated
                service analytics where you have consented.
              </li>
              <li>
                Comply with law, respond to lawful requests, and establish or
                defend legal claims.
              </li>
            </Bullets>
            <p>
              We do not use your data for behavioural advertising, and we do not
              sell or rent it. We do not use children&apos;s data for tracking,
              behavioural monitoring or targeted advertising.
            </p>
          </Section>

          <Section title="6. Sharing and cross-border processing">
            <p>
              We share personal data only with processors that help us run the
              service, under confidentiality and data-processing terms:
            </p>
            <Bullets>
              <li>
                <Strong>MongoDB Atlas</Strong> — primary database hosting.
              </li>
              <li>
                <Strong>Appwrite</Strong> — storage for avatars, covers and post
                media.
              </li>
              <li>
                <Strong>Resend or Gmail SMTP</Strong> — delivery of OTP and
                password-reset email.
              </li>
              <li>
                <Strong>Web Push (VAPID)</Strong> — OS-level notifications when
                the app is closed.
              </li>
              <li>
                <Strong>Vercel</Strong> — hosting, plus optional aggregated
                analytics and performance measurement.
              </li>
            </Bullets>
            <p>
              These providers may process data outside India, including in the
              United States, the European Union and other regions where they
              operate. Cross-border transfers are made in accordance with
              Section 16 of the DPDP Act and any restrictions notified by the
              Government. You can ask us for the current processor list and
              locations at{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              .
            </p>
            <p>
              We may also disclose data where required by law, to protect the
              safety of users, or as part of a merger or acquisition subject to
              this notice.
            </p>
          </Section>

          <Section title="7. Retention and deletion">
            <Bullets>
              <li>
                <Strong>Account, profile and content:</Strong> kept while your
                account exists. If you deactivate, the account is hidden for 30
                days so you can restore it; after that it is permanently purged.
                If you delete immediately or withdraw consent, it is hidden at
                once and removed by the deletion sweep, usually within 24 hours.
              </li>
              <li>
                <Strong>Consent records:</Strong> kept while the account exists
                and deleted with it. We may retain the minimum needed to
                demonstrate compliance where the law requires it.
              </li>
              <li>
                <Strong>Sessions:</Strong> 1 day, or 7 days when you choose
                &quot;remember me&quot;; deleted on logout, revocation or expiry.
              </li>
              <li>
                <Strong>OTPs:</Strong> 10 minutes, with a maximum of 5 attempts.
              </li>
              <li>
                <Strong>Post views:</Strong> raw view rows are deleted after 180
                days. The denormalized all-time view count remains on the post.
              </li>
              <li>
                <Strong>Reports, appeals and verification requests:</Strong> kept
                for as long as needed to review the matter and any appeal, then
                deleted or anonymised unless the law requires longer retention.
              </li>
              <li>
                <Strong>Push subscriptions:</Strong> kept until you disable push
                or delete your account; dead endpoints are removed when delivery
                fails.
              </li>
            </Bullets>
            <p>
              Deletion removes the account row, owned content and graph rows,
              sessions, notifications, push subscriptions, post-view rows,
              reports, appeals, verification requests, consent records and
              stored media. Some data may remain for a limited period in
              encrypted backups before they rotate.
            </p>
          </Section>

          <Section title="8. Your rights">
            <Bullets>
              <li>
                <Strong>Access.</Strong> Download a JSON copy of your profile,
                content, graph, sessions, notifications, consent history and
                other account records from Settings → Your data, or email us.
              </li>
              <li>
                <Strong>Correction.</Strong> Edit your profile at any time. Date
                of birth is locked after it is set to protect the age gate; if it
                is wrong, write to us and we will correct it after verification.
                Email changes are handled the same way.
              </li>
              <li>
                <Strong>Erasure.</Strong> Delete individual posts, or delete your
                account from Settings → Your data. Deactivation gives you a
                30-day restore window; immediate deletion and consent withdrawal
                schedule prompt erasure.
              </li>
              <li>
                <Strong>Grievance redressal.</Strong> Write to the Grievance
                Officer at{" "}
                <a
                  href="mailto:privacy@campuszen.tech"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  privacy@campuszen.tech
                </a>
                . We respond within 30 days (and no later than 90 days). If you
                are not satisfied, you may complain to the Data Protection Board
                of India at{" "}
                <a
                  href="https://dpboard.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  dpboard.gov.in
                </a>{" "}
                after giving us the opportunity to resolve it.
              </li>
              <li>
                <Strong>Nomination.</Strong> You may nominate a person to
                exercise your rights in the event of death or incapacity by
                writing to us with the nominee&apos;s details. We will record the
                nomination and verify it before acting on it.
              </li>
            </Bullets>
            <p>
              Requests are free. We may need to verify your identity before
              acting. We will explain if we cannot fulfil a request because of a
              legal obligation.
            </p>
          </Section>

          <Section title="9. Withdrawing consent">
            <p>
              You can withdraw consent at any time from the consent screen or by
              writing to{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              . Withdrawal is as easy as giving consent. Withdrawing core consent
              means we stop processing your account: it is deactivated at once
              and scheduled for deletion. Withdrawing optional analytics consent
              turns analytics off without deleting the account. Withdrawal does
              not affect processing that was lawful before it.
            </p>
            <p>
              A parent or guardian can withdraw consent for a 13–17 account on
              the{" "}
              <Link
                href="/parental-consent"
                className="text-[var(--cz-accent)] hover:underline"
              >
                guardian consent page
              </Link>
              . The account is deactivated and scheduled for deletion.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              CampusZen is for users aged 13 and over. We do not knowingly allow
              accounts for children under 13; if we learn that a child under 13
              has created one, we will remove it.
            </p>
            <p>
              For users aged 13–17, we require verifiable consent from a parent
              or lawful guardian before the account can be used. We check that
              the person approving is an identifiable adult through a one-time
              code sent to the guardian email and an adult confirmation. We do
              not undertake tracking or behavioural monitoring of children, and
              we do not serve targeted advertising to them. Streaks, achievement
              progression and post-view analytics are disabled for under-18
              accounts. A guardian can withdraw consent at any time.
            </p>
          </Section>

          <Section title="11. Security and breach notification">
            <p>
              We use technical and organisational safeguards: TLS in transit,
              bcrypt password hashing, HTTP-only cookies, per-device refresh-token
              rotation with replay detection, rate limits, input validation,
              access controls and consent audit records. No system is completely
              secure; use a strong, unique password and do not reuse it.
            </p>
            <p>
              If a personal data breach occurs, we will notify affected Data
              Principals without delay and intimate the Data Protection Board of
              India without delay, followed by a detailed submission within 72
              hours unless the Board allows more time. The notice will describe
              the breach, its likely impact and the steps we are taking.
            </p>
          </Section>

          <Section title="12. Cookies and analytics">
            <p>
              We use a session cookie to keep you signed in, a theme cookie to
              remember light or dark mode, and an analytics-consent cookie. We do
              not use advertising cookies or cross-site tracking cookies.
            </p>
            <p>
              Vercel Analytics and Speed Insights are optional, aggregated
              performance tools. They load only when your analytics-consent
              cookie is set to allow them; they do not build advertising
              profiles. You can withdraw analytics consent in the consent screen
              without deleting your account.
            </p>
          </Section>

          <Section title="13. Changes and complaints">
            <p>
              We may update this notice as the service or the law changes. When
              we do, we publish a new version and ask you to accept it before
              your next write action. The version and effective date are shown at
              the top of this page. Continued use after acceptance means the new
              notice applies.
            </p>
            <p>
              If you have a concern, contact the Grievance Officer first at{" "}
              <a
                href="mailto:privacy@campuszen.tech"
                className="text-[var(--cz-accent)] hover:underline"
              >
                privacy@campuszen.tech
              </a>
              . You can also complain to the Data Protection Board of India at{" "}
              <a
                href="https://dpboard.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--cz-accent)] hover:underline"
              >
                dpboard.gov.in
              </a>{" "}
              after giving us the opportunity to resolve it.
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
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-5 text-[15px] font-bold text-[var(--cz-text-inverse)]"
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
