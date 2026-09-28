import {
  Bell,
  Heart,
  PenLine,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: UserRound,
    title: "Student profiles",
    desc: "College, course, and year on every profile, with follower counts.",
  },
  {
    icon: PenLine,
    title: "Text-first posts",
    desc: "500 characters, chronological. No reels, no endless feed.",
  },
  {
    icon: Heart,
    title: "Likes, replies, reposts",
    desc: "The full core loop for conversations that go somewhere.",
  },
  {
    icon: Search,
    title: "Student search",
    desc: "Search across students and posts to find your crowd.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Follows, likes, replies, and reposts — in-app, no spam.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "Verified emails, hashed passwords, HTTP-only sessions.",
  },
];

export function Features() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
      <Reveal>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cz-text-secondary)]">
          What&apos;s inside
        </p>
        <h2 className="mt-4 max-w-[22ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          Everything you need. Nothing you don&apos;t.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.06}>
            <div className="border-t border-[var(--cz-border)] py-6">
              <Icon
                size={16}
                strokeWidth={1.75}
                className="text-[var(--cz-text-secondary)]"
                aria-hidden
              />
              <h3 className="mt-3 text-[14px] font-medium tracking-[-0.01em]">
                {title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
