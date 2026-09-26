"use client";

import { Loader2, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function BlockedProfile({ username, userId, isBlocker }) {
  const [loading, setLoading] = useState(false);

  const onUnblock = async () => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      await api.unblockUser(userId);
      window.location.reload();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)]">
        <UserX className="h-5 w-5 text-[var(--cz-text-secondary)]" />
      </span>
      <h1 className="mt-4 text-[16px] font-semibold tracking-[-0.02em]">
        This profile is unavailable
      </h1>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[13px] leading-[19px] text-[var(--cz-text-secondary)]">
        {isBlocker
          ? `You blocked @${username}. Unblock to see their profile and posts again.`
          : "You can't view this profile right now."}
      </p>
      {isBlocker ? (
        <Button
          onClick={onUnblock}
          disabled={loading}
          variant="secondary"
          className="mt-5 h-[38px] px-6"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unblock"}
        </Button>
      ) : null}
    </div>
  );
}
