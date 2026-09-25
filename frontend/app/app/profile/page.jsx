"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircle, Image as ImageIcon, Heart, Settings } from "lucide-react";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function OwnProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((r) => {
        if (!cancelled) setUser(r.data?.user);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load profile");
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
      <div className="mx-auto w-full max-w-[640px] grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto w-full max-w-[640px]">
        <EmptyState icon={Settings} title="Profile unavailable" description={error || "Could not load your profile. Try refreshing."} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <ProfileHeader
        user={user}
        isOwn
        onEdit={() => {
          // placeholder — will open edit modal in next step
          window.dispatchEvent(new CustomEvent("cz:toast", { detail: "Edit profile — coming next" }));
        }}
      />

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Your posts will show here. Create your first post — text up to 500 chars for MVP."
          actionLabel="Create post"
          actionHref="/app/create"
        />
      ) : tab === "replies" ? (
        <EmptyState icon={MessageCircle} title="No replies yet" description="Replies you make to other posts will appear here." />
      ) : tab === "media" ? (
        <EmptyState icon={ImageIcon} title="No media yet" description="Media uploads land in V1. Text-only for MVP." />
      ) : (
        <EmptyState icon={Heart} title="No likes yet" description="Posts you like will be collected here." />
      )}

      <div className="rounded-[12px] border border-dashed border-[var(--cz-border)] p-3 text-center text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">
        Own profile • @{user.username} • Edit will allow `bio, college, course, academicYear, avatarUrl` per PRD §8.
      </div>
    </div>
  );
}
