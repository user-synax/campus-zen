"use client";

import { Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EditProfileModal } from "@/components/app/EditProfileModal";
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
import { useMe } from "@/lib/hooks/queries";

export default function OwnProfilePage() {
  const queryClient = useQueryClient();
  // Cached session from the shell — no second /me, the header paints instantly.
  const { data: meData, isPending: loading } = useMe();
  const [override, setOverride] = useState(null);
  const user = override || meData?.data?.user || null;
  const [tab, setTab] = useState("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState({
    open: false,
    type: "followers",
  });

  const handleSaved = (u) => {
    setOverride(u);
    queryClient.setQueryData(["me"], (old) => {
      if (!old) return old;
      return { ...old, data: { ...old.data, user: u } };
    });
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

  if (!user) {
    return (
      <EmptyState
        icon={Settings}
        title="Profile unavailable"
        description="Could not load your profile. Try refreshing."
      />
    );
  }

  return (
    <div>
      <ProfileHeader
        user={user}
        isOwn
        onEdit={() => setEditOpen(true)}
        onFollowersClick={() =>
          setFollowModal({ open: true, type: "followers" })
        }
        onFollowingClick={() =>
          setFollowModal({ open: true, type: "following" })
        }
      />

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <TabPosts
          username={user.username}
          currentUser={user}
          pinnedPost={user.pinnedPost}
          onPinChange={(p) =>
            handleSaved({ ...user, pinnedPost: p })
          }
        />
      ) : tab === "replies" ? (
        <TabReplies username={user.username} isOwn />
      ) : tab === "media" ? (
        <TabMedia username={user.username} currentUser={user} />
      ) : tab === "likes" ? (
        <TabLikes username={user.username} currentUser={user} isOwn />
      ) : tab === "reposts" ? (
        <TabReposts username={user.username} currentUser={user} isOwn />
      ) : tab === "github" ? (
        <TabGitHub
          github={user.socialLinks?.github}
          onLink={() => setEditOpen(true)}
        />
      ) : null}

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        onSaved={handleSaved}
      />
      <FollowModal
        open={followModal.open}
        onClose={() => setFollowModal((s) => ({ ...s, open: false }))}
        userId={user._id}
        type={followModal.type}
        viewerId={user._id}
      />
    </div>
  );
}
