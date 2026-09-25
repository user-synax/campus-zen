"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Github, UserX, Loader2 } from "lucide-react";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FollowModal } from "@/components/app/FollowModal";
import { api } from "@/lib/api";
import { ContributionGraph, ContributionGraphBlock, ContributionGraphCalendar, ContributionGraphFooter, ContributionGraphTotalCount, ContributionGraphLegend } from "@/components/ui/contribution-graph";

export default function PublicProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followModal, setFollowModal] = useState({ open: false, type: "followers" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [meRes, userRes] = await Promise.allSettled([api.me(), api.getUser(username)]);
        if (cancelled) return;
        if (meRes.status === "fulfilled") {
          const m = meRes.value.data?.user;
          setMe(m);
          setIsGuest(false);
          if (userRes.status === "fulfilled" && userRes.value.data?.user?.isFollowing !== undefined) {
            setIsFollowing(Boolean(userRes.value.data?.user.isFollowing));
          }
        } else {
          setIsGuest(true);
          setMe(null);
        }
        if (userRes.status === "fulfilled") {
          const u = userRes.value.data?.user;
          setUser(u);
          if (u?.isFollowing !== undefined) setIsFollowing(Boolean(u.isFollowing));
        } else {
          const e = userRes.reason;
          setError(e?.data?.message || e?.message || "Student not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isOwn = me && user && me.username === user.username;

  const handleFollow = async () => {
    if (!user || isOwn || isGuest) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user._id);
        setIsFollowing(false);
        setUser((u) => ({ ...u, followersCount: Math.max(0, (u.followersCount ?? 1) - 1) }));
      } else {
        await api.followUser(user._id);
        setIsFollowing(true);
        setUser((u) => ({ ...u, followersCount: (u.followersCount ?? 0) + 1 }));
      }
    } catch {}
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4 max-w-[640px] mx-auto">
        <EmptyState icon={UserX} title="Student not found" description={error || `No student @${username}`} actionLabel="Explore students" actionHref="/u" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[640px] mx-auto">
      {!isGuest ? null : (
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">Join CampusZen to connect</p>
            <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Follow @{user.username}, discover classmates, and post.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-[var(--cz-border)] px-4 h-[36px] text-[13px] font-medium hover:bg-[var(--cz-surface-strong)] transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">
              Join
            </Link>
          </div>
        </div>
      )}

      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onEdit={isOwn ? () => (window.location.href = "/app/profile") : undefined}
        onFollow={isGuest || isOwn ? undefined : handleFollow}
        onFollowersClick={() => setFollowModal({ open: true, type: "followers" })}
        onFollowingClick={() => setFollowModal({ open: true, type: "following" })}
      />

      {/* hide actions for guest: ProfileHeader already hides Follow when onFollow undefined */}
      {isGuest ? (
        <p className="text-center text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">Public profile • clean URL /u/{user.username} • Follow hidden for guests</p>
      ) : null}

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <EmptyState icon={Github} title={isGuest ? "Join to see posts" : "No posts yet"} description={isGuest ? `Log in to see @${user.username}’s posts and interact.` : `@${user.username} hasn’t posted yet.`} actionLabel={isGuest ? "Join CampusZen" : undefined} actionHref={isGuest ? "/signup" : undefined} />
      ) : tab === "github" ? (
        user.socialLinks?.github ? (
          <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Github className="h-4 w-4" /> {user.socialLinks.github}’s contributions
              </h3>
              <a href={`https://github.com/${user.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[var(--cz-muted)] hover:text-[#9aa0ff] underline-offset-4 hover:underline">
                View on GitHub →
              </a>
            </div>
            <ContributionGraph username={user.socialLinks.github} blockSize={11} blockMargin={3} blockRadius={2} className="w-full">
              <ContributionGraphCalendar>{(props) => <ContributionGraphBlock {...props} />}</ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 flex-col sm:flex-row sm:items-center gap-2">
                <ContributionGraphTotalCount className="text-[11px] text-[var(--cz-text-secondary)]" />
                <ContributionGraphLegend className="text-[11px]" />
              </ContributionGraphFooter>
            </ContributionGraph>
          </div>
        ) : (
          <EmptyState icon={Github} title="No GitHub linked" description={`@${user.username} hasn’t linked GitHub yet.`} />
        )
      ) : (
        <EmptyState icon={Github} title="Empty tab" description="More tabs coming soon." />
      )}

      <FollowModal open={followModal.open} onClose={() => setFollowModal((s) => ({ ...s, open: false }))} userId={user._id} type={followModal.type} viewerId={me?._id} />

      <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60">
        Public URL: <span className="font-mono text-[var(--cz-text-secondary)]">/u/{user.username}</span> • Also available at <Link href={`/app/profile/${user.username}`} className="underline">/app/profile/{user.username}</Link> when logged in.
      </p>
    </div>
  );
}
