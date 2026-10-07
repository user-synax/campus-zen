"use client";

import { FileText, Loader2, UserX } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BlockedProfile } from "@/components/app/BlockedProfile";
import { EditProfileModal } from "@/components/app/EditProfileModal";
import { EmptyState } from "@/components/app/EmptyState";
import { FollowModal } from "@/components/app/FollowModal";
import { PrivateProfile } from "@/components/app/PrivateProfile";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import {
  TabArticles,
  TabGitHub,
  TabLikes,
  TabMedia,
  TabPosts,
  TabReplies,
  TabReposts,
} from "@/components/app/ProfileTabsContent";
import { ReportDialog } from "@/components/app/ReportDialog";
import { api } from "@/lib/api";

export default function UserProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState({
    open: false,
    type: "followers",
  });
  const [blocked, setBlocked] = useState(null);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [meRes, userRes] = await Promise.allSettled([
          api.me(),
          api.getUser(username),
        ]);
        if (cancelled) return;
        if (meRes.status === "fulfilled") {
          const m = meRes.value.data?.user;
          setMe(m);
          if (m && userRes.status === "fulfilled") {
            const u = userRes.value.data?.user;
            if (u && m._id !== u._id) setIsFollowing(Boolean(u.isFollowing));
          }
        }
        if (userRes.status === "fulfilled") {
          const u = userRes.value.data?.user;
          setUser(u);
          if (u?.isFollowing !== undefined)
            setIsFollowing(Boolean(u.isFollowing));
          if (u?.isFollowRequested !== undefined) setIsRequested(Boolean(u.isFollowRequested));
        } else {
          const e = userRes.reason;
          if (e?.data?.code === "PROFILE_BLOCKED")
            setBlocked(e.data?.details || { username });
          else if (e?.status === 404) setError("Student not found");
          else if (e?.status === 401)
            setError("Please log in to view profiles");
          else
            setError(
              e?.data?.message || e?.message || "Failed to load profile",
            );
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

  const handleBlockToggle = async () => {
    if (!user || isOwn || blockLoading) return;
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

  const handleFollow = async () => {
    if (!user || isOwn) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user._id);
        setIsFollowing(false);
        setIsRequested(false);
        setUser((u) => ({
          ...u,
          followersCount: Math.max(0, (u.followersCount ?? 1) - 1),
        }));
      } else if (isRequested) {
        await api.unfollowUser(user._id);
        setIsRequested(false);
        setUser((u) => ({ ...u, isFollowRequested: false }));
      } else {
        const res = await api.followUser(user._id);
        if (res?.data?.requested) {
          setIsRequested(true);
          setUser((u) => ({ ...u, isFollowRequested: true }));
        } else {
          setIsFollowing(true);
          setUser((u) => ({ ...u, followersCount: (u.followersCount ?? 0) + 1 }));
        }
      }
    } catch (e) {
      if (e.data?.code === "SELF_FOLLOW")
        setError("You cannot follow yourself");
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  if (error || !user) {
    if (blocked) {
      return (
        <BlockedProfile
          username={blocked.username || username}
          userId={blocked.userId}
          isBlocker={blocked.isBlocker}
        />
      );
    }
    if (me && me.username?.toLowerCase() === String(username).toLowerCase()) {
      return (
        <div>
          <ProfileHeader user={me} isOwn onEdit={() => setEditOpen(true)} />
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description="Your posts will show here."
            actionLabel="Write a post"
            actionHref="/app/create"
          />
          <EditProfileModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            user={me}
            onSaved={setUser}
          />
        </div>
      );
    }
    return (
      <EmptyState
        icon={UserX}
        title="Student not found"
        description={error || `No student @${username} yet.`}
        actionLabel="Go to your profile"
        actionHref="/app/profile"
      />
    );
  }

  return (
    <div>
      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        isFollowing={isFollowing}
        isFollowRequested={isRequested}
        followLoading={followLoading}
        onEdit={() => setEditOpen(true)}
        onFollow={handleFollow}
        onFollowersClick={() =>
          setFollowModal({ open: true, type: "followers" })
        }
        onFollowingClick={() =>
          setFollowModal({ open: true, type: "following" })
        }
        onReportUser={isOwn ? undefined : () => setReportUserOpen(true)}
        onBlockToggle={isOwn ? undefined : handleBlockToggle}
        isBlocked={!!blocked}
        blockLoading={blockLoading}
      />

      {user.privateHidden && !isOwn ? (
        <PrivateProfile user={user} isFollowRequested={isRequested} onFollow={handleFollow} followLoading={followLoading} />
      ) : (
        <>
          <ProfileTabs active={tab} onChange={setTab} />

          {tab === "posts" ? (
            <TabPosts
              username={user.username}
              currentUser={me}
              pinnedPost={user.pinnedPost}
              onPinChange={(p) => setUser((u) => ({ ...u, pinnedPost: p }))}
            />
          ) : tab === "articles" ? (
            <TabArticles username={user.username} currentUser={me} />
          ) : tab === "replies" ? (
            <TabReplies username={user.username} />
          ) : tab === "media" ? (
            <TabMedia username={user.username} currentUser={me} />
          ) : tab === "likes" ? (
            <TabLikes username={user.username} currentUser={me} />
          ) : tab === "reposts" ? (
            <TabReposts username={user.username} currentUser={me} />
          ) : tab === "github" ? (
            <TabGitHub
              github={user.socialLinks?.github}
              onLink={isOwn ? () => setEditOpen(true) : undefined}
            />
          ) : null}
        </>
      )}

      {isOwn ? (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          user={user}
          onSaved={setUser}
        />
      ) : null}
      {reportUserOpen && !isOwn ? (
        <ReportDialog
          targetType="user"
          targetId={user._id}
          targetLabel={`@${user.username}`}
          onClose={() => setReportUserOpen(false)}
          onSubmitted={() => setReportUserOpen(false)}
        />
      ) : null}
      <FollowModal
        open={followModal.open}
        onClose={() => setFollowModal((s) => ({ ...s, open: false }))}
        userId={user._id}
        type={followModal.type}
        viewerId={me?._id}
      />
    </div>
  );
}
