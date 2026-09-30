"use client";

import { Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";

export default function OwnProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState({
    open: false,
    type: "followers",
  });

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((r) => {
        if (!cancelled) setUser(r.data?.user);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e.message || "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    return (
      <EmptyState
        icon={Settings}
        title="Profile unavailable"
        description={error || "Could not load your profile. Try refreshing."}
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
          onPinChange={(p) => setUser((u) => ({ ...u, pinnedPost: p }))}
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
        onSaved={(u) => setUser(u)}
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
