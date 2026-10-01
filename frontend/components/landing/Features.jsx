import {
  BarChart3,
  Bell,
  Bookmark,
  Hash,
  Heart,
  PenLine,
  School,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: UserRound,
    title: "Student profiles",
    desc: "Avatar, cover, bio, college, course, and year — with follower, following, and post counts plus pinned posts.",
  },
  {
    icon: PenLine,
    title: "Posts with images & polls",
    desc: "500 characters, one image, or a 2–4 option poll. Edit or delete your own anytime.",
  },
  {
    icon: Heart,
    title: "Likes, replies, reposts",
    desc: "The full core loop for campus conversations, with threaded replies and counts.",
  },
  {
    icon: Bookmark,
    title: "Bookmarks & pins",
    desc: "Save posts for later and pin one post to the top of your profile.",
  },
  {
    icon: Hash,
    title: "Hashtags & trending",
    desc: "Tags are extracted automatically. Follow trending topics and open any tag feed.",
  },
  {
    icon: School,
    title: "Colleges",
    desc: "College pages with member lists and college-only post feeds, built from profile data.",
  },
  {
    icon: Search,
    title: "Student search",
    desc: "Full-text search across students and posts to find your crowd.",
  },
  {
    icon: Bell,
    title: "Realtime notifications",
    desc: "Follows, likes, replies, and reposts — listed in-app and pushed live over SSE.",
  },
  {
    icon: BarChart3,
    title: "Suggestions & discovery",
    desc: "Suggested students to follow plus Following and Discovery feed tabs.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "OTP-verified emails, bcrypt hashing, HTTP-only sessions, Zod validation, and rate limits.",
  },
];

export function Features() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <h2 className="max-w-[20ch] text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          Everything you need. Nothing you don&apos;t.
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.06}>
            <div className="border-t border-[var(--cz-border)] py-5">
              <Icon
                size={20}
                strokeWidth={1.8}
                className="text-[var(--cz-text-secondary)]"
                aria-hidden
              />
              <h3 className="mt-3 text-[17px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
