import { AppShell } from "@/components/app/AppShell";

export const metadata = {
  title: "Colleges",
  description:
    "Browse colleges on CampusZen and meet the students posting from each campus. Find your college community.",
};

export default function CLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
