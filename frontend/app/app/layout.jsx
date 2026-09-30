"use client";

import { AppShell } from "@/components/app/AppShell";

export default function AppLayout({ children }) {
  return <AppShell requireAuth>{children}</AppShell>;
}
