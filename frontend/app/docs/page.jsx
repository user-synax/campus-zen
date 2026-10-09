import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";
import { DocsRedirect } from "./DocsRedirect";

export const metadata = {
  title: "Docs",
  description:
    "Learn what CampusZen is, how it works, and what you can do — posts, profiles, colleges, and safety. Start with the guide, then join free.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "CampusZen Docs",
    description:
      "What CampusZen is, how it works, what you can do, and where it's headed.",
    url: "https://campuszen.app/docs",
  },
};

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
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

function TocLink({ href, children }) {
  return (
    <a
      href={href}
      className="inline-flex h-[32px] items-center rounded-full border border-[var(--cz-border-strong)] px-3 text-[13px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
    >
      {children}
    </a>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <DocsRedirect />
      <header className="sticky top-0 z-30 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-[53px] max-w-[700px] items-center justify-between px-4">
          <Link
            href="/"
            className="text-[var(--cz-text-primary)] transition-opacity hover:opacity-70"
            aria-label="CampusZen home"
          >
            <BrandMark size={26} title="CampusZen" />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Docs">
            <Link
              href="/terms"
              className="hidden h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] sm:inline-flex"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hidden h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] sm:inline-flex"
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
        <p className="inline-flex items-center rounded-full border border-[var(--cz-border-strong)] px-3 py-1 text-[13px] font-bold leading-[18px] text-[var(--cz-text-secondary)]">
          Public guide · no login needed
        </p>
        <h1 className="mt-4 text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em]">
          CampusZen Docs
        </h1>
        <p className="mt-2 text-[13px] text-[var(--cz-text-tertiary)]">
          Last updated Oct 2026 · MVP complete
        </p>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen is a student-first social network. Discover students, follow
          people, post short updates, and interact — built for campus life in
          India. This page is the public summary of{" "}
          <span className="font-bold text-[var(--cz-text-primary)]">
            README, PRD, DESIGN, and developer docs
          </span>
          , with internals left out.
        </p>

        <nav
          aria-label="On this page"
          className="mt-6 flex flex-wrap gap-2 border-y border-[var(--cz-border)] py-4"
        >
          <TocLink href="#what">What it is</TocLink>
          <TocLink href="#how">How it works</TocLink>
          <TocLink href="#features">Features</TocLink>
          <TocLink href="#not">What it&apos;s not</TocLink>
          <TocLink href="#roadmap">Roadmap</TocLink>
          <TocLink href="#design">Design</TocLink>
          <TocLink href="#safety">Safety</TocLink>
          <TocLink href="#faq">FAQ</TocLink>
        </nav>

        <div className="mt-10 space-y-9">
          <Section id="what" title="1. What is CampusZen?">
            <p>
              An X-style social app scoped to college students. One core loop,
              done well:
            </p>
            <p className="rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-surface-strong)] px-4 py-3 font-mono text-[13px] leading-[20px] text-[var(--cz-text-primary)]">
              Sign up → Verify email (OTP) → Discover students → Follow → Post →
              Like / Reply / Repost → Get notified → Return
            </p>
            <p>
              Intentionally small MVP: text-first posts, chronological feeds,
              in-app notifications, block/report moderation. No DMs, no reels,
              no recommendation black box.
            </p>
          </Section>

          <Section id="how" title="2. How it works">
            <Bullets>
              <li>
                <Strong>Sign up — </Strong>
                pick a username, add your name, email, and password. Only{" "}
                <Strong>gmail.com</Strong> and <Strong>proton.me</Strong>{" "}
                addresses are accepted in the MVP.
              </li>
              <li>
                <Strong>Verify email — </Strong>
                enter the 6-digit OTP sent to your inbox to activate posting and
                following.
              </li>
              <li>
                <Strong>Discover students — </Strong>
                browse the students directory and college pages by college,
                course, and year.
              </li>
              <li>
                <Strong>Follow — </Strong>
                follow classmates and seniors. Your Following feed shows their
                newest posts first.
              </li>
              <li>
                <Strong>Post — </Strong>
                share up to 500 characters, add photos/GIFs/short video or a 2–4
                option poll. Hashtags and mentions are picked up automatically.
              </li>
              <li>
                <Strong>Interact & return — </Strong>
                like, reply, repost, bookmark, and get notified when someone
                follows, likes, replies, or reposts you.
              </li>
            </Bullets>
          </Section>

          <Section id="features" title="3. What you can do">
            <Bullets>
              <li>
                <Strong>Profiles — </Strong>
                avatar, cover, display name, username, bio, college,
                course/branch, year, follower/following/post counts, and a
                pinned post.
              </li>
              <li>
                <Strong>Posts — </Strong>
                create, edit, or delete your own. 500 characters plus media or a
                poll.
              </li>
              <li>
                <Strong>Feeds — </Strong>
                <Strong>Following</Strong> (people you follow) and{" "}
                <Strong>Discovery</Strong> (recent public posts), newest first.
                Guests get a public preview.
              </li>
              <li>
                <Strong>Interactions — </Strong>
                like, reply threads, repost, bookmark, and changeable poll
                votes.
              </li>
              <li>
                <Strong>Discovery — </Strong>
                search users, posts, and colleges; follow hashtags; check
                trending topics and suggested students.
              </li>
              <li>
                <Strong>Colleges — </Strong>
                college pages with members and college posts.
              </li>
              <li>
                <Strong>Notifications — </Strong>
                in-app alerts for follows, likes, replies, and reposts, with
                unread counts.
              </li>
              <li>
                <Strong>Privacy controls — </Strong>
                private accounts with follow requests, block/unblock, and report
                with appeal.
              </li>
            </Bullets>
          </Section>

          <Section id="not" title="4. What CampusZen is not (yet)">
            <p>Out of scope by design for the MVP:</p>
            <Bullets>
              <li>Direct messages or group chats</li>
              <li>Communities, stories, clips/short video feeds, events</li>
              <li>Marketplace, premium, virtual currency, AI features</li>
              <li>Mobile apps and complex recommendation algorithms</li>
            </Bullets>
            <p className="border-l-2 border-[var(--cz-accent)] pl-3 text-[13px]">
              Those belong to V1–V3. The MVP stays focused so the core social
              loop works reliably on low-to-mid-range devices and normal mobile
              networks.
            </p>
          </Section>

          <Section id="roadmap" title="5. Roadmap">
            <Bullets>
              <li>
                <Strong>MVP — Core social network (complete): </Strong>
                auth + OTP, profiles, follow, text+media+poll posts, feeds,
                likes/replies/reposts, search, notifications, block/report,
                bookmarks, hashtags, colleges, suggestions.
              </li>
              <li>
                <Strong>V1 — Rich student platform (in progress): </Strong>
                better feed ranking, student/college verification, expanded
                college pages, profile customization, better notifications.
              </li>
              <li>
                <Strong>V2 — Communities: </Strong>
                college groups, roles, feeds, and discovery.
              </li>
              <li>
                <Strong>V3 — Realtime campus platform: </Strong>
                DMs, group chats, voice/video, clips, events.
              </li>
            </Bullets>
          </Section>

          <Section id="design" title="6. Design at a glance">
            <p>
              X-style monochrome interface with exactly one chromatic accent.
              Content comes first; chrome stays out of the way.
            </p>
            <Bullets>
              <li>
                <Strong>One accent — #1d9bf0 </Strong>
                only on things you can tap: buttons, links, active states.
              </li>
              <li>
                <Strong>Flat surfaces — </Strong>
                white on white, separated by 1px hairlines. No card shadows.
              </li>
              <li>
                <Strong>Pill controls — </Strong>
                every button, tag, and avatar is fully rounded.
              </li>
              <li>
                <Strong>Compact type — </Strong>
                Inter at 15px body and 20/23px headings, left-aligned for
                scannability.
              </li>
            </Bullets>
          </Section>

          <Section id="safety" title="7. Safety & accounts">
            <Bullets>
              <li>
                Sessions use secure HTTP-only cookies. Never share your
                password.
              </li>
              <li>
                Report posts or users, block unwanted accounts, delete your own
                content anytime.
              </li>
              <li>
                Read the details in{" "}
                <Link
                  href="/terms"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  Privacy
                </Link>
                .
              </li>
            </Bullets>
          </Section>

          <Section id="faq" title="8. FAQ">
            <Bullets>
              <li>
                <Strong>Is CampusZen free? </Strong>
                Yes — create an account with a gmail.com or proton.me email.
              </li>
              <li>
                <Strong>Can I browse without an account? </Strong>
                Yes — the students directory, college pages, and public profiles
                have a guest preview. Posting and following need an account.
              </li>
              <li>
                <Strong>
                  I&apos;m logged in — why can&apos;t I see this page?{" "}
                </Strong>
                Docs is a guest guide. Signing in takes you straight to{" "}
                <Link
                  href="/app"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  /app
                </Link>
                .
              </li>
            </Bullets>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--cz-border)] pt-6">
          <Link
            href="/signup"
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-5 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            Join CampusZen
          </Link>
          <Link
            href="/terms"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            View Terms
          </Link>
          <Link
            href="/privacy"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Privacy Policy
          </Link>
        </div>

        <p className="mt-8 text-center text-[13px] text-[var(--cz-text-tertiary)]">
          CampusZen · Student Network · India
        </p>
      </main>
    </div>
  );
}
