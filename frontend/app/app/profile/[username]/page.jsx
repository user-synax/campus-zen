"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, MessageCircle, Image as ImageIcon, Heart, UserX } from "lucide-react";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function UserProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [meRes, userRes] = await Promise.allSettled([api.me(), api.getUser(username)]);
        if (cancelled) return;
        if (meRes.status === "fulfilled") setMe(meRes.value.data?.user);
        if (userRes.status === "fulfilled") {
          setUser(userRes.value.data?.user);
        } else {
          const e = userRes.reason;
          // if backend users route not yet deployed, show me if usernames match
          if (e?.status === 404) setError("Student not found");
          else if (e?.status === 401) setError("Please log in to view profiles");
          else setError(e?.data?.message || e?.message || "Failed to load profile");
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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[640px] grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  }

  if (error || !user) {
    // fallback: if viewing own username via dynamic route, show me
    if (me && me.username?.toLowerCase() === String(username).toLowerCase()) {
      return (
        <div className="mx-auto w-full max-w-[640px] space-y-4">
          <ProfileHeader user={me} isOwn onEdit={() => {}} />
          <EmptyState icon={FileText} title="No posts yet" description="Your posts will show here." actionLabel="Create post" actionHref="/app/create" />
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-[640px] space-y-4">
        <EmptyState icon={UserX} title="Student not found" description={error || `No student @${username} yet. User profiles are backed by GET /api/users/:username — will be live once users route is deployed.`} actionLabel="Back to profile" actionHref="/app/profile" />
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
          Tip: create another account with a different username to test cross-profile views. Own profile is at <Link href="/app/profile" className="underline text-[var(--cz-text-primary)]">/app/profile</Link> .
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        onEdit={() => window.dispatchEvent(new CustomEvent("cz:toast", { detail: "Edit profile — coming next" }))}
        onFollow={() => {
          setFollowLoading(true);
          setTimeout(() => {
            setIsFollowing((v) => !v);
            setFollowLoading(false);
          }, 500);
        }}
      />

      {/* follow state hint */}
      {!isOwn && isFollowing ? (
        <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">Following @{user.username} — static demo (backend follow coming next)</div>
      ) : null}

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <EmptyState icon={FileText} title={`No posts yet`} description={`@${user.username} hasn’t posted anything. Posts will show here newest first.`} />
      ) : tab === "replies" ? (
        <EmptyState icon={MessageCircle} title="No replies yet" description="Replies will appear here." />
      ) : tab === "media" ? (
        <EmptyState icon={ImageIcon} title="No media yet" description="Media uploads in V1." />
      ) : (
        <EmptyState icon={Heart} title="No likes yet" description="Likes will be collected here." />
      )}
    </div>
  );
}
