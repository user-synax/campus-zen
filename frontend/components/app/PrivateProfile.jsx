"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrivateProfile({ user, isFollowRequested, onFollow, followLoading }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--cz-surface-strong)]">
        <Lock className="h-6 w-6 text-[var(--cz-text-secondary)]" aria-hidden />
      </span>
      <h2 className="mt-3 text-[17px] font-extrabold">This account is private</h2>
      <p className="mt-1 max-w-[36ch] text-[14px] text-[var(--cz-text-secondary)]">
        Follow @{user?.username} to see their posts. Follow requests need approval.
      </p>
      {onFollow ? (
        <Button onClick={onFollow} disabled={!!followLoading} variant={isFollowRequested ? "secondary" : "primary"} className="mt-4 min-w-[140px]">
          {followLoading ? "…" : isFollowRequested ? "Requested" : "Request to follow"}
        </Button>
      ) : null}
    </div>
  );
}
