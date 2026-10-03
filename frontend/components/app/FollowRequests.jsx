"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import { CzImage } from "@/components/app/CzImage";
import { api } from "@/lib/api";
import { useIncomingRequests, useOutgoingRequests } from "@/lib/hooks/queries";

export function FollowRequests() {
  const qc = useQueryClient();
  const { data: inData, isPending: inLoading, refetch: refetchIn } = useIncomingRequests(true);
  const { data: outData, refetch: refetchOut } = useOutgoingRequests(true);
  const incoming = inData?.data?.requests || inData?.data?.requests === undefined ? inData?.data?.requests || [] : [];
  const outgoing = outData?.data?.requests || [];
  const [acting, setActing] = useState(null);

  const refresh = () => {
    refetchIn();
    refetchOut();
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const onAccept = async (id) => {
    setActing(id);
    try {
      await api.acceptFollowRequest(id);
      refresh();
    } catch {}
    setActing(null);
  };
  const onDecline = async (id) => {
    setActing(id);
    try {
      await api.declineFollowRequest(id);
      refresh();
    } catch {}
    setActing(null);
  };
  const onCancel = async (targetId) => {
    setActing(targetId);
    try {
      await api.unfollowUser(targetId);
      refresh();
    } catch {}
    setActing(null);
  };

  return (
    <section aria-label="Follow requests" className="mt-4 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
        <UserPlus className="h-4 w-4" aria-hidden /> Follow requests
        {incoming.length > 0 ? (
          <span className="grid min-w-[22px] place-items-center rounded-full bg-[var(--cz-accent)] px-1.5 text-[13px] font-bold leading-[22px] text-white">
            {incoming.length}
          </span>
        ) : null}
      </p>
      <div className="p-4">
        <p className="text-[13px] font-bold uppercase text-[var(--cz-text-secondary)]">Incoming</p>
        {inLoading ? (
          <p className="flex items-center gap-2 py-3 text-[14px] text-[var(--cz-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : incoming.length === 0 ? (
          <p className="py-2 text-[14px] text-[var(--cz-text-secondary)]">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-[var(--cz-border)]">
            {incoming.map((r) => (
              <li key={r._id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[12px] font-bold">
                  {r.requester?.avatarUrl ? (
                    <CzImage src={r.requester.avatarUrl} alt="" className="h-full w-full rounded-full" imgClassName="h-full w-full" />
                  ) : (
                    (r.requester?.fullName || r.requester?.username || "U").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{r.requester?.fullName || r.requester?.username}</span>
                  <span className="block truncate text-[13px] text-[var(--cz-text-secondary)]">@{r.requester?.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAccept(r._id)}
                  disabled={acting === r._id}
                  aria-label={`Accept ${r.requester?.username}`}
                  className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[var(--cz-accent)] text-white disabled:opacity-50"
                >
                  {acting === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(r._id)}
                  disabled={acting === r._id}
                  aria-label={`Decline ${r.requester?.username}`}
                  className="grid h-[32px] w-[32px] place-items-center rounded-full border border-[var(--cz-border-strong)] disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[13px] font-bold uppercase text-[var(--cz-text-secondary)]">Sent</p>
        {outgoing.length === 0 ? (
          <p className="py-2 text-[14px] text-[var(--cz-text-secondary)]">No sent requests.</p>
        ) : (
          <ul className="divide-y divide-[var(--cz-border)]">
            {outgoing.map((r) => (
              <li key={r._id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 text-[14px]">
                  <span className="font-bold">@{r.target?.username}</span>
                  <span className="text-[var(--cz-text-secondary)]"> · pending</span>
                </span>
                <button
                  type="button"
                  onClick={() => onCancel(r.target?._id)}
                  disabled={acting === r.target?._id}
                  className="h-[30px] rounded-full border border-[var(--cz-border-strong)] px-3 text-[13px] font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
