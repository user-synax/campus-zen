"use client";

import { useEffect, useState } from "react";
import { FileText, MessageCircle, Image as ImageIcon, Heart, Repeat2, Settings, Github, Loader2 } from "lucide-react";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { EditProfileModal } from "@/components/app/EditProfileModal";
import { FollowModal } from "@/components/app/FollowModal";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";
import { ContributionGraph, ContributionGraphBlock, ContributionGraphCalendar, ContributionGraphFooter, ContributionGraphTotalCount, ContributionGraphLegend } from "@/components/ui/contribution-graph";

function TabPosts({ username, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api
      .getUserPosts(username, { page: 1, limit: 20 })
      .then((r) => {
        if (!cancelled) setPosts(r.data?.posts || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);
  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" /></div>;
  if (posts.length === 0) return <EmptyState icon={FileText} title="No posts yet" description="Your posts will show here. Create your first post — text up to 500 chars." actionLabel="Create post" actionHref="/app/create" />;
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} onDelete={(id) => setPosts((prev) => prev.filter((x) => x._id !== id))} onUpdate={(u) => setPosts((prev) => prev.map((x) => (x._id === u._id ? u : x)))} />
      ))}
    </div>
  );
}

function TabReplies({ username }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api
      .getUserReplies(username, { page: 1, limit: 20 })
      .then((r) => {
        if (!cancelled) setReplies(r.data?.comments || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);
  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" /></div>;
  if (replies.length === 0) return <EmptyState icon={MessageCircle} title="No replies yet" description="Replies you make to other posts will appear here." />;
  return (
    <div className="space-y-3">
      {replies.map((c) => (
        <div key={c._id} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4">
          <p className="text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]">Replied to @{c.post?.author?.username || "post"}</p>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] line-clamp-2">{c.post?.text || "Post"}</p>
          <p className="mt-2 text-[14px] leading-[20px] whitespace-pre-wrap break-words text-[var(--cz-text-primary)]">{c.text}</p>
          <p className="mt-2 text-[11px] text-[var(--cz-text-secondary)]/60">{new Date(c.createdAt).toLocaleString("en-IN")}</p>
        </div>
      ))}
    </div>
  );
}

function TabLikes({ username, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api
      .getUserLikes(username, { page: 1, limit: 20 })
      .then((r) => {
        if (!cancelled) setPosts(r.data?.posts || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);
  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" /></div>;
  if (posts.length === 0) return <EmptyState icon={Heart} title="No likes yet" description="Posts you like will be collected here." />;
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

function TabReposts({ username, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api
      .getUserReposts(username, { page: 1, limit: 20 })
      .then((r) => {
        if (!cancelled) setPosts(r.data?.posts || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);
  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" /></div>;
  if (posts.length === 0) return <EmptyState icon={Repeat2} title="No reposts yet" description="Posts you repost will appear here." />;
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

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
        <TabPosts username={user.username} currentUser={user} />
      ) : tab === "replies" ? (
        <TabReplies username={user.username} />
      ) : tab === "media" ? (
        <EmptyState icon={ImageIcon} title="No media yet" description="Media uploads via Appwrite bucket coming soon. Text only for MVP." />
      ) : tab === "likes" ? (
        <TabLikes username={user.username} currentUser={user} />
      ) : tab === "reposts" ? (
        <TabReposts username={user.username} currentUser={user} />
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
            <ContributionGraph username={user.socialLinks.github} blockSize={11} blockMargin={3} blockRadius={2} className="w-full [&_svg]:w-full">
              <ContributionGraphCalendar>{(props) => <ContributionGraphBlock {...props} />}</ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 flex-col sm:flex-row sm:items-center gap-2">
                <ContributionGraphTotalCount className="text-[11px] text-[var(--cz-text-secondary)]" />
                <ContributionGraphLegend className="text-[11px]" />
              </ContributionGraphFooter>
            </ContributionGraph>
          </div>
        ) : (
          <EmptyState icon={Github} title="No GitHub linked" description="Link your GitHub username to show your contribution graph here." actionLabel="Add GitHub" onAction={() => setEditOpen(true)} />
        )
      ) : null}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} user={user} onSaved={(u) => setUser(u)} />
      <FollowModal open={followModal.open} onClose={() => setFollowModal((s) => ({ ...s, open: false }))} userId={user._id} type={followModal.type} viewerId={user._id} />
    </div>
  );
}
