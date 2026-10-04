"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { PageHeader } from "@/components/app/PageHeader";
import { UserBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { useMe } from "@/lib/hooks/queries";

export default function VerifiedPage() {
  const { data: meData } = useMe();
  const user = meData?.data?.user || null;
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getVerificationStatus();
      setStatus(res.data || null);
    } catch (err) {
      setError(err.data?.message || err.message || "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRequest = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.requestVerification(message ? { message } : {});
      await load();
    } catch (err) {
      setError(err.data?.message || err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const eligibility = status?.eligibility || null;
  const pending = status?.pending || null;
  const cooldownUntil = status?.cooldownUntil || null;
  const isVerified = Boolean(user?.isVerified || eligibility?.isVerified);
  const posts = eligibility?.posts ?? user?.postCount ?? 0;
  const followers = eligibility?.followers ?? user?.followersCount ?? 0;
  const eligible = Boolean(eligibility?.eligible);
  const initial = (user?.fullName?.[0] || user?.username?.[0] || "U").toUpperCase();
  const previewUser = user ? { ...user, isVerified: true } : null;

  return (
    <div>
      <PageHeader title="Get Verified" subtitle="Blue tick for active contributors" />

      <div className="p-4">
        {/* Preview mockup — how the badge will look on their profile */}
        <div className="rounded-[16px] border border-[var(--cz-border)] p-4">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--cz-text-secondary)]">
            Preview
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[18px] font-bold">
              {user?.avatarUrl ? (
                <CzImage src={user.avatarUrl} alt="" className="h-full w-full rounded-full" imgClassName="h-full w-full" />
              ) : (
                initial
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-[20px] leading-6 font-extrabold">
                  {user?.fullName || "Your name"}
                </span>
                {previewUser ? <UserBadge user={previewUser} size="md" /> : <BadgeCheck className="h-[18px] w-[18px] text-[var(--cz-accent)]" />}
              </span>
              <span className="mt-0.5 block truncate text-[15px] text-[var(--cz-text-secondary)]">
                @{user?.username || "username"}
              </span>
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            This is how the blue tick will appear next to your name in feed, profile and search.
          </p>
        </div>

        {/* Criteria */}
        <div className="mt-4 rounded-[16px] border border-[var(--cz-border)] p-4">
          <p className="text-[15px] font-extrabold">Eligibility — either one</p>
          {loading ? (
            <p className="mt-2 flex items-center gap-2 text-[14px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-[15px]">
              <li className="flex items-center justify-between gap-3">
                <span>50+ posts</span>
                <span className={posts >= 50 ? "font-bold text-[var(--cz-success)]" : "text-[var(--cz-text-secondary)]"}>
                  {posts}/50 {posts >= 50 ? "✓" : ""}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>100+ followers</span>
                <span className={followers >= 100 ? "font-bold text-[var(--cz-success)]" : "text-[var(--cz-text-secondary)]"}>
                  {followers}/100 {followers >= 100 ? "✓" : ""}
                </span>
              </li>
            </ul>
          )}
          {error ? <p className="mt-2 text-[14px] text-[var(--cz-error)]">{error}</p> : null}
        </div>

        {/* Action */}
        <div className="mt-4 rounded-[16px] border border-[var(--cz-border)] p-4">
          {isVerified ? (
            <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--cz-accent)]">
              <BadgeCheck className="h-5 w-5" /> You are verified.
            </p>
          ) : pending ? (
            <div>
              <p className="text-[15px] font-bold">Request pending review</p>
              <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">
                Submitted {pending.createdAt ? new Date(pending.createdAt).toLocaleString() : ""}. You will see the blue tick once admin approves.
              </p>
            </div>
          ) : cooldownUntil ? (
            <div>
              <p className="text-[15px] font-bold">Recently reviewed</p>
              <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">
                You can re-appeal after {new Date(cooldownUntil).toLocaleDateString()}.
              </p>
            </div>
          ) : eligible ? (
            <div>
              <label htmlFor="verify-msg" className="text-[14px] font-bold">
                Message to admin (optional)
              </label>
              <input
                id="verify-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                placeholder="Why should you be verified?"
                className="mt-2 h-[40px] w-full rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 text-[15px] outline-none placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]"
              />
              <button
                type="button"
                onClick={onRequest}
                disabled={submitting}
                className="mt-3 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--cz-accent)] px-4 text-[15px] font-bold text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <BadgeCheck className="h-[18px] w-[18px]" />}
                {submitting ? "Submitting…" : "Request verification"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[15px] font-bold">Not eligible yet</p>
              <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">
                Post more or grow followers to unlock the request button.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
