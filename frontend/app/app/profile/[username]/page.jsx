"use client";

import {
  FileText,
  Github,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BlockedProfile } from "@/components/app/BlockedProfile";
import { EditProfileModal } from "@/components/app/EditProfileModal";
import { EmptyState } from "@/components/app/EmptyState";
import { FollowModal } from "@/components/app/FollowModal";
import { PostCard } from "@/components/app/PostCard";
import { PinnedSection, splitPinned } from "@/components/app/PinnedSection";
import { ProfileMediaGrid } from "@/components/app/ProfileMedia";
import { RichText } from "@/components/app/RichText";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { ReportDialog } from "@/components/app/ReportDialog";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/ui/contribution-graph";
import { api } from "@/lib/api";

function TabPosts({ username, currentUser, pinnedPost, onPinChange }) {
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
  if (loading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  const { pinnedId, list } = splitPinned(posts, pinnedPost);
  if (posts.length === 0 && !pinnedId)
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description={`@${username} hasn’t posted anything.`}
      />
    );
  return (
    <div className="space-y-3">
      <PinnedSection
        pinnedPost={pinnedPost}
        posts={posts}
        currentUser={currentUser}
        onPinChange={onPinChange}
      />
      {list.map((p) => (
        <PostCard
          key={p._id}
          post={p}
          currentUser={currentUser}
          isPinned={pinnedId ? String(p._id) === pinnedId : false}
          onPinChange={onPinChange}
        />
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
  if (loading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (replies.length === 0)
    return (
      <EmptyState
        icon={MessageCircle}
        title="No replies yet"
        description="Replies will appear here."
      />
    );
  return (
    <div className="space-y-3">
      {replies.map((c) => (
        <div
          key={c._id}
          className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4"
        >
          <p className="text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]">
            Replied to @{c.post?.author?.username || "post"}
          </p>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] line-clamp-2">
            {c.post?.text || "Post"}
          </p>
          <p className="mt-2 text-[14px] leading-[20px] whitespace-pre-wrap break-words text-[var(--cz-text-primary)]">
            <RichText text={c.text} />
          </p>
          <p className="mt-2 text-[11px] text-[var(--cz-text-secondary)]/60">
            {new Date(c.createdAt).toLocaleString("en-IN")}
          </p>
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
  if (loading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Heart}
        title="No likes yet"
        description="Likes will be collected here."
      />
    );
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
  if (loading)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Repeat2}
        title="No reposts yet"
        description="Reposts will appear here."
      />
    );
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

export default function UserProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
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
        setUser((u) => ({
          ...u,
          followersCount: Math.max(0, (u.followersCount ?? 1) - 1),
        }));
      } else {
        await api.followUser(user._id);
        setIsFollowing(true);
        setUser((u) => ({ ...u, followersCount: (u.followersCount ?? 0) + 1 }));
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
      <div className="mx-auto w-full max-w-[640px] grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  }

  if (error || !user) {
    if (blocked) {
      return (
        <div className="mx-auto w-full max-w-[640px] space-y-4">
          <BlockedProfile
            username={blocked.username || username}
            userId={blocked.userId}
            isBlocker={blocked.isBlocker}
          />
        </div>
      );
    }
    if (me && me.username?.toLowerCase() === String(username).toLowerCase()) {
      return (
        <div className="mx-auto w-full max-w-[640px] space-y-4">
          <ProfileHeader user={me} isOwn onEdit={() => setEditOpen(true)} />
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description="Your posts will show here."
            actionLabel="Create post"
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
      <div className="mx-auto w-full max-w-[640px] space-y-4">
        <EmptyState
          icon={UserX}
          title="Student not found"
          description={error || `No student @${username} yet.`}
          actionLabel="Back to profile"
          actionHref="/app/profile"
        />
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
          Tip: create another account with a different username to test
          cross-profile views. Own profile is at{" "}
          <Link
            href="/app/profile"
            className="underline text-[var(--cz-text-primary)]"
          >
            /app/profile
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        isFollowing={isFollowing}
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
        blockLoading={blockLoading}
      />

      {!isOwn && isFollowing ? (
        <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
          Following @{user.username}
        </div>
      ) : null}

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "posts" ? (
        <TabPosts
          username={user.username}
          currentUser={me}
          pinnedPost={user.pinnedPost}
          onPinChange={(p) => setUser((u) => ({ ...u, pinnedPost: p }))}
        />
      ) : tab === "replies" ? (
        <TabReplies username={user.username} />
      ) : tab === "media" ? (
        <ProfileMediaGrid username={user.username} currentUser={me} />
      ) : tab === "likes" ? (
        <TabLikes username={user.username} currentUser={me} />
      ) : tab === "reposts" ? (
        <TabReposts username={user.username} currentUser={me} />
      ) : tab === "github" ? (
        user.socialLinks?.github ? (
          <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Github className="h-4 w-4" /> {user.socialLinks.github}’s
                contributions
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
              className="w-full"
            >
              <ContributionGraphCalendar>
                {(props) => <ContributionGraphBlock {...props} />}
              </ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 flex-col sm:flex-row sm:items-center gap-2">
                <ContributionGraphTotalCount className="text-[11px] text-[var(--cz-text-secondary)]" />
                <ContributionGraphLegend className="text-[11px]" />
              </ContributionGraphFooter>
            </ContributionGraph>
          </div>
        ) : (
          <EmptyState
            icon={Github}
            title="No GitHub linked"
            description={`@${user.username} hasn’t linked GitHub yet. If this is you, add it.`}
            actionLabel={isOwn ? "Add GitHub" : undefined}
            onAction={isOwn ? () => setEditOpen(true) : undefined}
          />
        )
      ) : null}

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
