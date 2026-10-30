import {
  Bell,
  Download,
  EyeOff,
  Flag,
  Lock,
  MonitorSmartphone,
  Palette,
  User,
  Users,
} from "lucide-react";

// One entry per settings sub-page. The index renders straight from this list
// and filters with the same predicate, so the visible rows and the search
// results can never drift apart.
//
// `keywords` is the search bag: title and sub are already matched, this adds
// the vocabulary people actually type ("dark mode", "block", "delete").
export const SECTIONS = [
  {
    id: "account",
    title: "Account",
    sub: "Profile, status and verified badge",
    keywords:
      "profile name username handle avatar photo edit identity verified badge tick email address details status standing good limited restricted suspended member since joined last login",
    Icon: User,
  },
  {
    id: "appearance",
    title: "Appearance",
    sub: "App theme and profile style",
    keywords:
      "theme dark light mode color colour display accent profile banner handle style pro cosmetic",
    Icon: Palette,
  },
  {
    id: "notifications",
    title: "Notifications",
    sub: "Push alerts on this device",
    keywords: "push alerts bell device browser os closed app",
    Icon: Bell,
  },
  {
    id: "content",
    title: "Content",
    sub: "18+ posts and sensitive media",
    keywords: "18+ sensitive mature blur spoiler date of birth age dob reveal",
    Icon: EyeOff,
  },
  {
    id: "privacy",
    title: "Privacy",
    sub: "Replies, mentions and who sees you",
    keywords:
      "private account approval followers reply replies mention mentions visibility college course year hide hidden who can",
    Icon: Lock,
  },
  {
    id: "people",
    title: "People",
    sub: "Follow requests and blocked accounts",
    keywords:
      "follow requests followers following requests approve decline block blocked unblock unfollow remove",
    Icon: Users,
  },
  {
    id: "safety",
    title: "Safety",
    sub: "Reports and appeals",
    keywords: "reports appeals moderation flag abuse review status",
    Icon: Flag,
  },
  {
    id: "security",
    title: "Security",
    sub: "Devices and active sessions",
    keywords:
      "devices sessions sign out log out login password where signed in",
    Icon: MonitorSmartphone,
  },
  {
    id: "data",
    title: "Your data",
    sub: "Export, deactivate or delete",
    keywords: "export download delete deactivate restore account json",
    Icon: Download,
  },
];

// One predicate for the whole page: a section matches when its title, its
// one-line sub, or its keyword bag contains the query.
export function matches(query, ...texts) {
  if (!query) return true;
  return texts.join(" ").toLowerCase().includes(query);
}
