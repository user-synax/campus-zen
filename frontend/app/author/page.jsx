import { Github } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";
import { XBrandIcon } from "@/components/share/SocialIcons";
import { avatarRingClass } from "@/lib/avatar";
import Image from "next/image";

// The author of CampusZen. Kept in one place so the bio, the links and the
// JSON-LD never drift apart.
const AUTHOR = {
  name: "Ayush",
  handle: "user_synax",
  role: "Full-stack developer",
  tagline: "Building CampusZen — a student-first social network.",
  github: "https://github.com/user-synax",
  x: "https://x.com/User_Synax",
  xHandle: "User_Synax",
  repo: "https://github.com/user-synax/campus-zen",
};

// The owner ring (red) is the same one the app draws around the owner's
// avatar, so this monogram reads as the real account.
const ownerRing = avatarRingClass({ email: "usersynax@gmail.com" });

export const metadata = {
  title: "Author",
  description:
    "Ayush is the full-stack developer behind CampusZen, a student-first social network for Indian college campuses. Read who he is, why he built it, and how to reach him.",
  alternates: { canonical: "/author" },
  openGraph: {
    type: "profile",
    url: "https://campuszen.tech/author",
    title: "Ayush — author of CampusZen",
    description:
      "Who builds CampusZen, why they built it, and how to get in touch.",
  },
  twitter: {
    card: "summary",
    title: "Ayush — author of CampusZen",
    description:
      "Who builds CampusZen, why they built it, and how to get in touch.",
  },
};

const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: AUTHOR.name,
  alternateName: `@${AUTHOR.handle}`,
  url: "https://campuszen.tech/author",
  jobTitle: AUTHOR.role,
  description:
    "Full-stack developer building CampusZen, a student-first social network for college campuses in India.",
  sameAs: [AUTHOR.github, AUTHOR.x],
  worksFor: {
    "@type": "Organization",
    name: "CampusZen",
    url: "https://campuszen.tech",
  },
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

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer me"
      className="inline-flex h-[36px] items-center gap-2 rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
    >
      {children}
      <span>{label}</span>
    </a>
  );
}

export default function AuthorPage() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <script type="application/ld+json">{JSON.stringify(personLd)}</script>

      <header className="sticky top-0 z-30 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-[53px] max-w-[700px] items-center justify-between px-4">
          <Link
            href="/"
            className="text-[var(--cz-text-primary)] transition-opacity hover:opacity-70"
            aria-label="CampusZen home"
          >
            <BrandMark size={26} title="CampusZen" />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Author">
            <Link
              href="/docs"
              className="hidden h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] sm:inline-flex"
            >
              Docs
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
        {/* Author card — monogram avatar, name, handle, role, links. */}
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-[28px] leading-none font-extrabold`}
          >
            <Image src={"https://avatars.githubusercontent.com/u/193066302?v=4"} width={100} height={100}/>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em]">
              {AUTHOR.name}
            </h1>
            <p className="mt-1 text-[15px] font-bold text-[var(--cz-text-secondary)]">
              @{AUTHOR.handle}
            </p>
            <p className="mt-1 text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
              {AUTHOR.role} · {AUTHOR.tagline}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <SocialLink href={AUTHOR.github} label="GitHub">
            <Github className="h-[16px] w-[16px]" aria-hidden="true" />
          </SocialLink>
          <SocialLink href={AUTHOR.x} label={`@${AUTHOR.xHandle}`}>
            <XBrandIcon className="h-[15px] w-[15px]" />
          </SocialLink>
        </div>

        <p className="mt-6 text-[13px] text-[var(--cz-text-tertiary)]">
          Last updated Oct 2026 · Author of CampusZen
        </p>

        <p className="mt-6 max-w-[62ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen is a student-first social network for college campuses in
          India. I design, build and maintain it — the interface, the backend,
          the moderation tools and the docs — and I answer for the product end
          to end.
        </p>

        <div className="mt-10 space-y-9">
          <Section title="1. Who I am">
            <p>
              I&apos;m a full-stack developer who builds things for the people
              around him. CampusZen is my primary project: a social network
              scoped to college students, with the whole product — sign-up,
              verification, feeds, profiles, colleges, moderation — designed
              around how campus life actually works.
            </p>
            <p>
              I work in the open. The codebase, the product requirements, the
              design system and the developer guide are all public, and the
              project ships under the{" "}
              <a
                href={AUTHOR.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cz-accent)] hover:underline"
              >
                AGPL-3.0 licence
              </a>
              . Anyone can read how it works, run it locally, or contribute to
              it.
            </p>
          </Section>

          <Section title="2. Why I built CampusZen">
            <p>
              Campus life was scattered. The people in your batch, the
              department, the club, the seniors worth following — each group
              lived in a different app, and the useful signal got buried under
              everything else. A student network that only worked if you already
              had an audience wasn&apos;t solving that.
            </p>
            <p>
              So I built the small version first and made it work properly. The
              MVP is deliberately narrow: 500-character posts with photos, video
              and polls, chronological feeds, replies, reposts, hashtags,
              college pages, bookmarks, and notifications. No DMs, no stories,
              no recommendation black box. Everything in the core loop works
              reliably before anything decorative is added.
            </p>
            <p>
              The other constraint was the device. Most students I&apos;m
              building for are on mid-range hardware and ordinary mobile
              networks, so the app stays fast and light, and the design stays
              quiet — one accent colour, hairline borders, no card shadows.
              Content first, chrome out of the way.
            </p>
          </Section>

          <Section title="3. What this project stands for">
            <Bullets>
              <li>
                <Strong>Students first — </Strong>a scoped product, not a
                general network. Campus is the context the whole thing is
                designed around.
              </li>
              <li>
                <Strong>Small on purpose — </Strong>a narrow MVP that works
                beats a wide one that doesn&apos;t. Communities and realtime
                chat come later, on a foundation that already holds.
              </li>
              <li>
                <Strong>Privacy by default — </Strong>
                private accounts, follow requests, block and report on every
                piece of content, and no selling of data. Ever.
              </li>
              <li>
                <Strong>Open and auditable — </Strong>
                public repository, published requirements and design docs, and
                an AGPL licence that keeps derivatives honest.
              </li>
            </Bullets>
            <p className="border-l-2 border-[var(--cz-accent)] pl-3 text-[13px]">
              The full product plan — MVP, V1, V2 and V3 — is written up in the{" "}
              <Link
                href="/docs"
                className="text-[var(--cz-accent)] hover:underline"
              >
                public docs
              </Link>
              .
            </p>
          </Section>

          <Section title="4. Get in touch">
            <p>
              The fastest way to reach me is a DM on X, or an issue on the
              repository if it&apos;s a bug or a feature request. Both are read
              by me, and issues keep the discussion public and searchable for
              the next person with the same problem.
            </p>
            <Bullets>
              <li>
                <Strong>
                  Say hello, report a bug, or request a feature —{" "}
                </Strong>
                <a
                  href={`${AUTHOR.repo}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  open an issue
                </a>{" "}
                on GitHub.
              </li>
              <li>
                <Strong>Short questions and quick replies — </Strong>
                <a
                  href={AUTHOR.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  @{AUTHOR.xHandle}
                </a>{" "}
                on X.
              </li>
              <li>
                <Strong>Something urgent or private — </Strong>
                the{" "}
                <Link
                  href="/privacy"
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  privacy policy
                </Link>{" "}
                lists the right address for data and privacy requests.
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
            href="/docs"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Read the docs
          </Link>
          <Link
            href="/"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-5 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Back home
          </Link>
        </div>

        <p className="mt-8 text-center text-[13px] text-[var(--cz-text-tertiary)]">
          CampusZen · Student Network · India
        </p>
      </main>
    </div>
  );
}
