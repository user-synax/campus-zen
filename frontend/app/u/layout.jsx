import { AppShell } from "@/components/app/AppShell";

export const metadata = {
  title: "Students",
  description: "Discover students across colleges on CampusZen.",
};

/**
 * /u renders in the same frame as every other tab. The directory and
 * college pages below this segment require a session and bounce to
 * /login themselves; /u/[username] stays readable by guests.
 */
export default function ULayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
