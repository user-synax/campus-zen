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
    <div className="mx-auto w-full max-w-[600px] px-6 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--cz-border-strong)]">
        <UserX
          className="h-6 w-6 text-[var(--cz-text-secondary)]"
          strokeWidth={1.6}
          aria-hidden
        />
      </span>
      <h1 className="mt-5 text-[23px] font-extrabold leading-6 text-[var(--cz-text-primary)]">
        This profile is unavailable
      </h1>
      <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
        {isBlocker
          ? `You blocked @${username}. Unblock to see their profile and posts again.`
          : "You can't view this profile right now."}
      </p>
      {isBlocker ? (
        <Button
          onClick={onUnblock}
          disabled={loading}
          variant="secondary"
          className="mt-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Unblock @${username}`
          )}
        </Button>
      ) : null}
    </div>
  );
}
