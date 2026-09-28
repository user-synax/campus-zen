"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandLogo";
import { api } from "@/lib/api";

// Logged-in visitors skip guest-only pages (login/signup)
// and go straight to the app.
export function GuestGuard({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.me();
        if (!cancelled) router.replace("/app");
      } catch {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cz-bg)] px-4">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={40} />
          <span className="inline-flex items-center gap-2 text-[13px] text-[var(--cz-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </span>
        </div>
      </div>
    );
  }

  return children;
}
