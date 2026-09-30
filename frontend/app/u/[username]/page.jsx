"use client";

import { Loader2, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BlockedProfile } from "@/components/app/BlockedProfile";
import { EmptyState } from "@/components/app/EmptyState";
import { FollowModal } from "@/components/app/FollowModal";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import {
  TabGitHub,
  TabLikes,
  TabMedia,
  TabPosts,
  TabReplies,
  TabReposts,
} from "@/components/app/ProfileTabsContent";
import { ReportDialog } from "@/components/app/ReportDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe, useUser } from "@/lib/hooks/queries";

export default function PublicProfilePage() {
  const { username } = useParams();
  const [tab, setTab] = useState("posts");
  const [followLoading, setFollowLoading] = useState(false);
  const [followModal, setFollowModal] = useState({
    open: false,
    type: "followers",
  });
  const [blocked, setBlocked] = useState(null);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const isGuest = !me;

  const { data: userData, isPending, error } = useUser(username);
  const user = userData?.data?.user || null;
  const isFollowing = user?.isFollowing ?? false;

  const isOwn = me && user && me.username === user.username;

  const patchUser = (patch) => {
    queryClient.setQueryData(["user", username], (old) => {
      if (!old) return old;
      return {
        ...old,
        data: { ...old.data, user: { ...old.data.user, ...patch } },
      };
    });
  };

  const handleFollow = async () => {
    if (!user || isOwn || isGuest) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user._id);
        patchUser({
          isFollowing: false,
          followersCount: Math.max(0, (user.followersCount ?? 1) - 1),
        });
      } else {
        await api.followUser(user._id);
        patchUser({
          isFollowing: true,
          followersCount: (user.followersCount ?? 0) + 1,
        });
      }
    } catch {}
    setFollowLoading(false);
  };

  const handleBlockToggle = async () => {
    if (!user || isOwn || isGuest || blockLoading) return;
    setBlockLoading(true);
    try {
      await api.blockUser(user._id);
      setBlocked({
        username: user.username,
        userId: user._id,
        isBlocker: true,
      });
    } catch {}
    setBlockLoading(false);
  };

  if (isPending)
    return (
      <div className="grid place-items-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading profile"
        />
      </div>
    );

  if (blocked)
    return (
      <BlockedProfile
        username={blocked.username || username}
        userId={blocked.userId}
        isBlocker={blocked.isBlocker}
      />
    );

  if (error || !user)
    return (
      <div className="mx-auto w-full max-w-[600px]">
        <EmptyState
          icon={UserX}
          title="Student not found"
          description={
            error?.data?.message || error?.message || `No student @${username}`
          }
          actionLabel="Explore students"
          actionHref="/u"
        />
      </div>
    );

  return (
    <div>
      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onEdit={
          isOwn ? () => (window.location.href = "/app/profile") : undefined
        }
        onFollow={isGuest || isOwn ? undefined : handleFollow}
        onFollowersClick={() =>
          setFollowModal({ open: true, type: "followers" })
        }
        onFollowingClick={() =>
          setFollowModal({ open: true, type: "following" })
        }
        onReportUser={
          isGuest || isOwn ? undefined : () => setReportUserOpen(true)
        }
        onBlockToggle={isGuest || isOwn ? undefined : handleBlockToggle}
        blockLoading={blockLoading}
      />

      {/* Guest acquisition prompt — DESIGN.md Sign Up Card pattern, inline */}
      {isGuest ? (
        <div className="flex flex-col items-start gap-3 border-b border-[var(--cz-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
              Join CampusZen
            </h2>
            <p className="mt-1 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
              Follow @{user.username}, find classmates and post updates.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login">
              <Button variant="secondary">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <TabPosts
          username={user.username}
          currentUser={me}
          pinnedPost={user.pinnedPost}
          onPinChange={(p) => patchUser({ pinnedPost: p })}
        />
      ) : tab === "replies" ? (
        <TabReplies username={user.username} />
      ) : tab === "media" ? (
        <TabMedia username={user.username} currentUser={me} />
      ) : tab === "likes" ? (
        <TabLikes username={user.username} currentUser={me} />
      ) : tab === "reposts" ? (
        <TabReposts username={user.username} currentUser={me} />
      ) : tab === "github" ? (
        <TabGitHub github={user.socialLinks?.github} />
      ) : null}

      <FollowModal
        open={followModal.open}
        onClose={() => setFollowModal((s) => ({ ...s, open: false }))}
        userId={user._id}
        type={followModal.type}
        viewerId={me?._id}
      />
      {reportUserOpen ? (
        <ReportDialog
          targetType="user"
          targetId={user._id}
          targetLabel={`@${user.username}`}
          onClose={() => setReportUserOpen(false)}
          onSubmitted={() => setReportUserOpen(false)}
        />
      ) : null}
    </div>
  );
}
