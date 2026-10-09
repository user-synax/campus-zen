import { AppShell } from "@/components/app/AppShell";

export const metadata = {
  title: "Colleges",
  description: "Browse colleges and the students posting from each campus.",
};

export default function CLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
