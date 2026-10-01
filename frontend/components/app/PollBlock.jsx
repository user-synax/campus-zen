"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeLeft(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `Closes in ${Math.max(m, 1)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Closes in ${h}h`;
  const d = Math.floor(h / 24);
  return `Closes in ${d}d`;
}

/**
 * Single-choice poll, changeable until expiry.
 * Pre-vote shows plain option buttons; voted/closed shows % bars.
 * Optimistic so taps feel instant on slow free-tier hosts.
 */
export function PollBlock({
  postId,
  poll,
  myVote: initialVote,
  canVote = true,
}) {
  const [myVote, setMyVote] = useState(initialVote ?? null);
  const [counts, setCounts] = useState(() =>
    (poll?.options || []).map((o) => o.votes || 0),
  );
  const [total, setTotal] = useState(poll?.totalVotes || 0);
  const [busy, setBusy] = useState(-1);

  useEffect(() => {
    setMyVote(initialVote ?? null);
    setCounts((poll?.options || []).map((o) => o.votes || 0));
    setTotal(poll?.totalVotes || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, initialVote]);

  const closed = useMemo(() => {
    if (!poll) return true;
    if (poll.closed) return true;
    return new Date(poll.expiresAt).getTime() <= Date.now();
  }, [poll]);

  if (!poll?.options?.length) return null;
  const showResults = myVote != null || closed;

  const vote = async (idx) => {
    if (closed || busy !== -1 || !canVote) return;
    if (idx === myVote) return;
    const prevVote = myVote;
    const prevCounts = counts;
    const prevTotal = total;
    // optimistic: move one vote
    const next = [...counts];
    if (prevVote != null && next[prevVote] > 0) next[prevVote] -= 1;
    next[idx] = (next[idx] || 0) + 1;
    setCounts(next);
    setTotal(prevVote != null ? prevTotal : prevTotal + 1);
    setMyVote(idx);
    setBusy(idx);
    try {
      const res = await api.votePoll(postId, idx);
      const server = res.data || res;
      if (server?.poll) {
        setCounts(server.poll.options.map((o) => o.votes || 0));
        setTotal(server.poll.totalVotes || 0);
      }
      if (server?.myVote != null) setMyVote(server.myVote);
    } catch {
      setCounts(prevCounts);
      setTotal(prevTotal);
      setMyVote(prevVote);
    } finally {
      setBusy(-1);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <div className="flex flex-col gap-2 p-3">
        {poll.options.map((opt, i) => {
          if (!showResults) {
            return (
              <button
                key={i}
                type="button"
                disabled={closed || busy !== -1 || !canVote}
                onClick={(e) => {
                  e.stopPropagation();
                  vote(i);
                }}
                title={!canVote ? "Log in to vote" : undefined}
                className="flex min-h-[40px] w-full cursor-pointer items-center justify-between gap-2 rounded-[9999px] border border-[var(--cz-border-strong)] px-4 py-2 text-left text-[15px] leading-[20px] text-[var(--cz-text-primary)] transition-colors hover:border-[var(--cz-accent)] hover:text-[var(--cz-accent)] disabled:cursor-default disabled:opacity-60 disabled:hover:border-[var(--cz-border-strong)] disabled:hover:text-[var(--cz-text-primary)]"
              >
                <span className="truncate">{opt.text}</span>
                {busy === i ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          }
          const pct =
            total > 0 ? Math.round(((counts[i] || 0) / total) * 100) : 0;
          const mine = myVote === i;
          return (
            <button
              key={i}
              type="button"
              disabled={closed || busy !== -1 || !canVote}
              onClick={(e) => {
                e.stopPropagation();
                vote(i);
              }}
              title={
                closed
                  ? "Poll closed"
                  : !canVote
                    ? "Log in to vote"
                    : mine
                      ? "Your vote — tap another to change"
                      : "Tap to change vote"
              }
              className={cn(
                "relative flex min-h-[40px] w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-[8px] px-3 py-2 text-left text-[15px] leading-[20px] transition-colors",
                mine
                  ? "ring-1 ring-[var(--cz-accent)]"
                  : "hover:ring-1 hover:ring-[var(--cz-border-strong)] disabled:cursor-default disabled:hover:ring-0",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 transition-[width]",
                  mine
                    ? "bg-[var(--cz-accent-soft)]"
                    : "bg-[var(--cz-surface-strong)]",
                )}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-1.5">
                {mine ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-[var(--cz-accent)]"
                    aria-hidden
                  />
                ) : null}
                <span className="truncate font-medium text-[var(--cz-text-primary)]">
                  {opt.text}
                </span>
              </span>
              <span className="relative shrink-0 tabular-nums text-[var(--cz-text-secondary)]">
                {busy === i ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  `${pct}%`
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="border-t border-[var(--cz-border)] px-3 py-2 text-[13px] leading-[16px] text-[var(--cz-text-secondary)] tabular-nums">
        {total} {total === 1 ? "vote" : "votes"} · {timeLeft(poll.expiresAt)}
      </p>
    </div>
  );
}
