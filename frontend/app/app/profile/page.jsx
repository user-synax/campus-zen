"use client";

import { useEffect, useState } from "react";
import { FileText, MessageCircle, Image as ImageIcon, Heart, Settings, Github } from "lucide-react";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { EditProfileModal } from "@/components/app/EditProfileModal";
import { FollowModal } from "@/components/app/FollowModal";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { ContributionGraph, ContributionGraphBlock, ContributionGraphCalendar, ContributionGraphFooter, ContributionGraphTotalCount, ContributionGraphLegend } from "@/components/ui/contribution-graph";

export default function OwnProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState({ open: false, type: "followers" });

  const fetchMe = async () => {
    try {
      const r = await api.me();
      setUser(r.data?.user);
    } catch (e) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
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
        onEdit={() => setEditOpen(true)}
        onFollowersClick={() => setFollowModal({ open: true, type: "followers" })}
        onFollowingClick={() => setFollowModal({ open: true, type: "following" })}
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
      ) : tab === "likes" ? (
        <EmptyState icon={Heart} title="No likes yet" description="Posts you like will be collected here." />
      ) : tab === "github" ? (
        user.socialLinks?.github ? (
          <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Github className="h-4 w-4" /> {user.socialLinks.github}’s contributions
              </h3>
              <a
                href={`https://github.com/${user.socialLinks.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-[var(--cz-muted)] hover:text-[#9aa0ff] underline-offset-4 hover:underline"
              >
                View on GitHub →
              </a>
            </div>
            <ContributionGraph
              username={user.socialLinks.github}
              blockSize={11}
              blockMargin={3}
              blockRadius={2}
              className="w-full [&_svg]:w-full"
            >
              <ContributionGraphCalendar>{(props) => <ContributionGraphBlock {...props} />}</ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 flex-col sm:flex-row sm:items-center gap-2">
                <ContributionGraphTotalCount className="text-[11px] text-[var(--cz-text-secondary)]" />
                <ContributionGraphLegend className="text-[11px]" />
              </ContributionGraphFooter>
            </ContributionGraph>
            <p className="mt-3 text-[11px] leading-[14px] text-[var(--cz-text-secondary)]/60">Data via github-contributions-api • Last 12 months • Dark bg chips above keep profile clean.</p>
          </div>
        ) : (
          <EmptyState
            icon={Github}
            title="No GitHub linked"
            description="Link your GitHub username to show your contribution graph here. Classmates discover you by code."
            actionLabel="Add GitHub"
            onAction={() => setEditOpen(true)}
          />
        )
      ) : null}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} user={user} onSaved={(u) => setUser(u)} />

      <FollowModal open={followModal.open} onClose={() => setFollowModal((s) => ({ ...s, open: false }))} userId={user._id} type={followModal.type} viewerId={user._id} />

      <div className="rounded-[12px] border border-dashed border-[var(--cz-border)] p-3 text-center text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">
        @{user.username} • Followers/Following live counts • GitHub tab with graph
      </div>
    </div>
  );
}
