"use client";

import { AppShell } from "@/components/app/AppShell";

/** /c renders in the same frame as every other tab. */
export default function CLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
