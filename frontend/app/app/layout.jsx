import { AppShell } from "@/components/app/AppShell";

export const metadata = {
  title: "Feed",
  description:
    "Catch up on posts from students you follow and discover campus life across India. Log in to join the conversation.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }) {
  return <AppShell requireAuth>{children}</AppShell>;
}
